import { Client } from 'elasticsearch';
import { snomed } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
import * as utils from '../../../utils/utils';

// ID del atributo que genera una relación padre-hijo
const IsASct = '116680003';

const snowstormClient = new Client({
    host: snomed.snowstormElastic
});

async function httpGetSnowstorm(url: String, qs = {}, languageCode = 'es') {
    const [status, body] = await handleHttpRequest({
        url: `${snomed.snowstormHost}/${url}`,
        json: true,
        useQuerystring: true,
        headers: {
            'Accept-Language': languageCode
        },
        qs
    });
    if (status === 200) {
        return body;
    }
    return null;
}

function getSemanticTagFromFsn(fsn: String) {
    const startAt = fsn.lastIndexOf('(');
    const endAt = fsn.lastIndexOf(')');
    return fsn.substring(startAt + 1, endAt);
}

/**
 * Obtiene un objeto concepto a partir del conceptId
 *
 * @param sctid ConceptId
 */

export async function getConcept(sctid, format = 'full') {
    const concept = await httpGetSnowstorm(`browser/${snomed.snowstormBranch}/concepts/${sctid}`);
    if (concept) {
        if (format === 'full') {
            return concept;
        } else {
            return {
                conceptId: concept.conceptId,
                term: concept.pt.term,
                fsn: concept.fsn.term,
                semanticTag: getSemanticTagFromFsn(concept.fsn.term)
            };
        }
    }

    return null;
}

/**
 * Filtra las relaciones de un concepto
 * [TODO] Filtros de atributos y también por estados (stated y inferred)
 *
 * @param {conceptMoldel} concept Concepto completo
 */

export function filterRelationships(concept, { parent = true }) {
    const result = [];
    const relationships = concept.relationships;
    relationships.forEach((rel) => {
        if (rel.active === true && ((parent && rel.typeId === IsASct) || (!parent && rel.typeId !== IsASct))) {
            result.push({
                conceptId: rel.target.conceptId,
                term: rel.target.preferredTerm,
                fsn: rel.target.fullySpecifiedName,
                type: rel.characteristicType.conceptId === 'INFERRED_RELATIONSHIP' ? 'inferred' : 'stated'
            });
        }
    });
    return result;
}

/**
 * Obtiene los hijos de un concepto
 *
 * @param sctid ConceptId
 * @param {Boolean} all True para devolver hijos, nietos, bisnietos... de un concepto, false solo hijos directos.
 *
 */
export async function getChildren(sctid, { all = false, completed = true, leaf = false }) {
    let concepts;
    if (all) {
        const response = await httpGetSnowstorm(`${snomed.snowstormBranch}/concepts/${sctid}/descendants`, { limit: 1000, stated: false });
        if (response) {
            concepts = response.items;
        }
    } else {
        const response = await httpGetSnowstorm(`browser/${snomed.snowstormBranch}/concepts/${sctid}/children`, { limit: 1000, form: 'inferred' });
        if (response) {
            concepts = response;
        }
    }
    if (concepts) {
        const result = [];
        concepts.forEach((cpt) => {
            if (cpt.active === true) {
                if (completed) {
                    result.push({
                        conceptId: cpt.conceptId,
                        term: cpt.pt.term,
                        fsn: cpt.fsn.term,
                        semanticTag: getSemanticTagFromFsn(cpt.fsn.term)
                    });
                } else {
                    result.push(cpt.conceptId);
                }
            }
        });
        return result;
    }
    return null;
}

export async function getConcepts(conceptsIds: string[]) {
    const response = await httpGetSnowstorm(`${snomed.snowstormBranch}/concepts`, {
        limit: 1000,
        conceptIds: conceptsIds
    });
    if (response) {
        const items = response.items;
        const ps = items.map(async (concept) => {
            const parents = await httpGetSnowstorm(`browser/${snomed.snowstormBranch}/concepts/${concept.conceptId}/parents`, { limit: 1000, form: 'stated' });
            if (parents) {
                concept.relationships = parents;
                concept.relationships = filterRelationships(concept, { parent: true });
            }
            return {
                conceptId: concept.conceptId,
                term: concept.pt.term,
                fsn: concept.fsn.term,
                semanticTag: getSemanticTagFromFsn(concept.fsn.term),
                relationships: concept.relationships
            };
        });
        return await Promise.all(ps);
    }
    return null;
}

export async function getConceptByExpression(expression, term = null, form = 'stated', languageCode = 'es') {
    const qs: any = {
        limit: 10000,
        termActive: true,
        term
    };
    qs[form === 'stated' ? 'statedEcl' : 'ecl'] = expression;
    const response = await httpGetSnowstorm(`${snomed.snowstormBranch}/concepts`, qs, languageCode);
    if (response) {
        if (term) {
            const ids = response.items.map(c => c.conceptId);
            return await searchTerms(term, { languageCode, semanticTags: null }, ids);
        } else {
            const items = response.items;
            const ps = items.map((concept) => {
                return {
                    conceptId: concept.conceptId,
                    term: concept.pt.term,
                    fsn: concept.fsn.term,
                    semanticTag: getSemanticTagFromFsn(concept.fsn.term)
                };
            });
            return ps;
        }
    }
    return null;
}


export async function searchTerms(text, { semanticTags, languageCode }, conceptIds: string[] = null) {
    const textFold = utils.removeDiacritics(text).replace(/[\u00F1]/g, 'n');
    const terms = textFold.split(' ');
    const searchStrig = terms.map(i => i + '*').join(' ');
    semanticTags = semanticTags || [];
    languageCode = languageCode || 'es';

    // Buscamos todos los conceptos que tengas descripciones que matcheen con la busqueda.
    let ids;
    if (!conceptIds) {
        const searchResult = await snowstormClient.search({
            index: 'description',
            type: 'description',
            size: '10000',
            body: {
                query: {
                    bool: {
                        must: [
                            { term: { languageCode: { value: languageCode, boost: 1.0 } } },
                            branchesClause
                        ],
                        filter: [
                            {
                                simple_query_string: {
                                    query: searchStrig,
                                    fields: [
                                        'termFolded^1.0'
                                    ],
                                    flags: -1,
                                    default_operator: 'and',
                                    analyze_wildcard: false,
                                    auto_generate_synonyms_phrase_query: true,
                                    fuzzy_prefix_length: 0,
                                    fuzzy_max_expansions: 50,
                                    fuzzy_transpositions: true,
                                    boost: 1.0
                                }
                            }
                        ],
                        adjust_pure_negative: true,
                        boost: 1.0
                    }
                },
                stored_fields: ['descriptionId', 'conceptId'],
                sort: [
                    { termLen: { order: 'asc' } },
                    { _score: { order: 'asc' } }
                ]
            }
        });
        ids = searchResult.hits.hits.map(item => item.fields.conceptId[0]);
    } else {
        ids = conceptIds;
    }


    // Verificamos si los concepts están activos o no. Filtramos solo por activos.
    const conceptsActive = await snowstormClient.search({
        index: 'concept',
        type: 'concept',
        size: '10000',
        body: {
            query: {
                bool: {
                    filter: [
                        { terms: { active: [true], boost: 1.0 } },
                        { terms: { conceptId: ids, boost: 1.0 } },
                        branchesClause
                    ],
                    adjust_pure_negative: true,
                    boost: 1.0
                }
            }
        }
    });
    const idsActive = conceptsActive.hits.hits.map(item => item._source.conceptId);

    // Tenemos que hacer una segunda busqueda por semantic tag porque snowstorm no tiene el semtag en cada dato.
    const searchResult2 = await snowstormClient.search({
        index: 'description',
        type: 'description',
        size: '10000',
        body: {
            query: {
                bool: {
                    must: [
                        branchesClause,
                        { bool: { should: semanticTags.map(value => ({ term: { tag: value } })) } },
                        { term: { languageCode: { value: languageCode, boost: 1.0 } } },
                        { terms: { active: [true], boost: 1.0 } },
                        { terms: { typeId: ['900000000000003001'], boost: 1.0 } },
                        { terms: { conceptId: idsActive, boost: 1.0 } }
                    ],
                    adjust_pure_negative: true,
                    boost: 1.0
                }
            },
            _source: { includes: ['conceptId', 'term', 'tag'], excludes: [] }
        }
    });

    const realConcept = searchResult2.hits.hits.map(item => {
        return {
            conceptId: item._source.conceptId,
            fsn: item._source.term,
            semanticTag: item._source.tag
        };
    });

    // Por ultimo teniendo el listado de conceptos por activo y semtag volvemos a buscar los terminos que matcheen.
    const searchResult3 = await snowstormClient.search({
        index: 'description',
        type: 'description',
        size: '10000',
        body: {
            query: {
                bool: {
                    must: [
                        branchesClause,
                        { term: { languageCode: { value: languageCode, boost: 1.0 } } },
                    ],
                    must_not: [
                        { terms: { typeId: ['900000000000003001'], boost: 1.0 } }
                    ],
                    filter: [
                        {
                            simple_query_string: {
                                query: searchStrig,
                                fields: [
                                    'termFolded^1.0'
                                ],
                                flags: -1,
                                default_operator: 'and',
                                analyze_wildcard: false,
                                auto_generate_synonyms_phrase_query: true,
                                fuzzy_prefix_length: 0,
                                fuzzy_max_expansions: 50,
                                fuzzy_transpositions: true,
                                boost: 1.0
                            }
                        },
                        {
                            bool: {
                                must: [{ terms: { conceptId: realConcept.map(i => i.conceptId), boost: 1.0 } }],
                                adjust_pure_negative: true,
                                boost: 1.0
                            }
                        },
                        { terms: { active: [true], boost: 1.0 } },
                    ],
                    adjust_pure_negative: true,
                    boost: 1.0
                },
            },
            _source: {
                includes: ['conceptId', 'term']
            },
            sort: [
                { termLen: { order: 'asc' } },
                { _score: { order: 'asc' } }
            ],
        }
    });
    const hash = {};
    realConcept.forEach(i => hash[i.conceptId] = i);
    return searchResult3.hits.hits.map(a => {
        return {
            ...hash[a._source.conceptId],
            term: a._source.term
        };
    }).sort((a: any, b: any) => {
        if (a.term.length < b.term.length) { return -1; }
        if (a.term.length > b.term.length) { return 1; }
        return 0;
    });

}

function getBranches() {
    let branchName: string = snomed.snowstormBranch;
    let index = branchName.indexOf('/');
    const branches = [];
    while (index >= 0) {
        const branch = branchName.substring(0, index);
        branches.push(branch);

        index = branchName.indexOf('/', index + 1);
        // branchName = branchName.substr(index + 1);
    }
    branches.push(branchName);

    return branches;
}


function branchFilterClause() {
    const branches = getBranches();

    const branchClause = branches.map(b => ({ term: { path: b } }));

    return { bool: { should: branchClause } };
}

const branchesClause = branchFilterClause();
