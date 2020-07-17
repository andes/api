import { snomed } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';

// ID del atributo que genera una relación padre-hijo
const IsASct = '116680003';
const StatedSct = '900000000000010007';

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

export async function getConceptByExpression(expression, term = null, form = 'stated', languageCode: 'es' | 'en' = 'es') {
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

async function searchByDescription({ text, semanticTags, languageCode }) {
    const qs = {
        semanticTags,
        term: text,
        active: true,
        conceptActive: true,
        language: languageCode,
        limit: 1000
    };
    const response = await httpGetSnowstorm(`browser/${snomed.snowstormBranch}/descriptions`, qs, languageCode);
    if (response) {
        let { items } = response;
        items = items.map(cpt => {
            return {
                conceptId: cpt.concept.conceptId,
                term: cpt.term,
                fsn: cpt.concept.fsn.term,
                semanticTag: getSemanticTagFromFsn(cpt.concept.fsn.term),
            };
        });
        return items;
    }
    return [];
}

async function searchByExpression({ text, languageCode, expression, semanticTags }) {
    const qs = {
        term: text,
        activeFilter: true,
        termActive: true,
        language: languageCode,
        limit: 1000,
        ecl: expression
    };
    const response = await httpGetSnowstorm(`${snomed.snowstormBranch}/concepts`, qs, languageCode);
    if (response) {
        let { items } = response;

        items = items.map(cpt => {
            return {
                conceptId: cpt.conceptId,
                term: cpt.pt.term,
                fsn: cpt.fsn.term,
                semanticTag: getSemanticTagFromFsn(cpt.fsn.term),
            };
        });
        if (semanticTags) {
            items = items.filter(concept => semanticTags.includes(concept.semanticTag));
        }
        return items;
    }
    return [];
}

type SearchTermParams = { semanticTags?: String[], languageCode?: 'es' | 'en', expression?: string };
export async function searchTerms(text, { semanticTags, languageCode, expression }: SearchTermParams, conceptIds: string[] = null) {
    languageCode = languageCode || 'es';
    let items;
    if (expression) {
        items = await searchByExpression({ text, languageCode, expression, semanticTags });
    } else {
        items = await searchByDescription({ text, semanticTags, languageCode });
    }

    if (conceptIds) {
        items = items.filter(item => conceptIds.find(c => c === item.conceptId));
    }
    items = items.sort((a: any, b: any) => {
        if (a.term.length < b.term.length) { return -1; }
        if (a.term.length > b.term.length) { return 1; }
        return 0;
    });
    return items;

}


function getBranches() {
    let branchName: string = snomed.snowstormBranch;
    let index = branchName.indexOf('/');
    const branches = [];
    while (index >= 0) {
        const branch = branchName.substring(0, index);
        branches.push(branch);

        index = branchName.indexOf('/', index + 1);
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
