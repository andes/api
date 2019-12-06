import { SnomedModel, TextIndexModel } from '../schemas/snomed';
import { makeMongoQuery } from './grammar/parser';
import * as utils from '../../../utils/utils';

// ID del atributo que genera una relación padre-hijo
const IsASct = '116680003';
const StatedSct = '900000000000010007';
// const InferredSct = '900000000000011006';

/**
 * Obtiene un objeto concepto a partir del conceptId
 *
 * @param sctid ConceptId
 */
export async function getConcept(sctid, format = 'full') {
    const concept: any = await SnomedModel.findOne({ conceptId: sctid });
    if (concept) {
        if (format === 'full') {
            return concept;
        } else {
            return {
                conceptId: concept.conceptId,
                term: concept.preferredTerm,
                fsn: concept.fullySpecifiedName,
                semanticTag: concept.semtag,
                refsetIds: concept.memberships.map(m => m.refset.conceptId)
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
        if (rel.active === true && ((parent && rel.type.conceptId === IsASct) || (!parent && rel.type.conceptId !== IsASct))) {
            result.push({
                conceptId: rel.destination.conceptId,
                term: rel.destination.preferredTerm,
                fsn: rel.destination.fullySpecifiedName,
                type: rel.characteristicType.conceptId === StatedSct ? 'stated' : 'inferred'
            });
        }
    });
    return result;
}


function checkType(concept, sctid) {
    for (const rel of concept.relationships) {
        if (rel.destination.conceptId === sctid && rel.type.conceptId === IsASct) {
            return rel.characteristicType.conceptId === StatedSct ? 'stated' : 'inferred';
        }
    }
    return '';
}

/**
 * Obtiene los hijos de un concepto
 *
 * @param sctid ConceptId
 * @param {Boolean} all True para devolver hijos, nietos, bisnietos... de un concepto, false solo hijos directos.
 *
 */
export async function getChildren(sctid, { all = false, completed = true, leaf = false }) {
    let query;
    if (all) {
        query = {
            $or: [
                { inferredAncestors: sctid },
                { statedAncestors: sctid }
            ]
        };
    } else {
        query = {
            relationships: {
                $elemMatch: {
                    'destination.conceptId': sctid,
                    'type.conceptId': IsASct,
                    active: true
                }
            }
        };
    }

    if (leaf) {
        query['isLeafInferred'] = true;
        query['isLeafStated'] = true;
    }

    const concepts: any[] = await SnomedModel.find(query);
    const result = [];
    concepts.forEach((cpt) => {
        if (cpt.active === true) {
            if (completed) {
                result.push({
                    conceptId: cpt.conceptId,
                    term: cpt.preferredTerm,
                    fsn: cpt.fullySpecifiedName,
                    type: checkType(cpt, sctid)
                });
            } else {
                result.push(cpt.conceptId);
            }
        }
    });
    return result;
}

export async function getConceptByExpression(expression, termSearch = null, form = 'stated', languageCode = 'es') {
    const options = {
        form
    };
    const query = makeMongoQuery(expression, options);

    if (termSearch) {
        const project = { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 };

        const conditions = [];
        const words = termSearch.split(' ');
        words.forEach((word) => {
            word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08');
            const expWord = '^' + utils.removeDiacritics(word) + '.*';
            conditions.push({ 'descriptions.words': { $regex: expWord } });
        });

        const pipeline = [
            {
                $match: query,
            },
            {
                $project: { ...project, descriptions: 1 }
            },
            {
                $unwind: '$descriptions'
            },
            {
                $match: {
                    'descriptions.languageCode': languageCode,
                    $and: conditions
                }
            },
            {
                $project: {
                    fsn: '$fullySpecifiedName',
                    term: '$descriptions.term',
                    conceptId: '$conceptId',
                    semanticTag: '$semtag'
                }
            }
        ];

        return await SnomedModel.aggregate(pipeline);
    } else {
        const docs: any[] = await SnomedModel.find(query, { fullySpecifiedName: 1, conceptId: 1, _id: false, semtag: 1 }).sort({ fullySpecifiedName: 1 });
        return docs.map((item) => {
            const term = item.fullySpecifiedName.substring(0, item.fullySpecifiedName.indexOf('(') - 1);
            return {
                fsn: item.fullySpecifiedName,
                term,
                conceptId: item.conceptId,
                semanticTag: item.semtag
            };
        });
    }
}

export async function getConcepts(conceptsIds) {
    return SnomedModel.aggregate([
        { $match: { conceptId: { $in: conceptsIds } } },
        { $unwind: '$relationships' },
        {
            $match: {
                'relationships.active': true,
                'relationships.characteristicType.conceptId': '900000000000010007',
                'relationships.type.conceptId': '116680003'
            }
        },
        {
            $project: {
                conceptId: 1,
                statedAncestors: 1,
                fullySpecifiedName: 1,
                preferredTerm: 1,
                semtag: 1,
                relationships: {
                    fsn: '$relationships.destination.fullySpecifiedName',
                    term: '$relationships.destination.fullySpecifiedName',
                    conceptId: '$relationships.destination.conceptId'
                }
            }
        },
        {
            $group: {
                _id: '$conceptId',
                conceptId: { $first: '$conceptId' },
                statedAncestors: { $first: '$statedAncestors' },
                fsn: { $first: '$fullySpecifiedName' },
                term: { $first: '$preferredTerm' },
                semanticTag: { $first: '$semtag' },
                relationships: { $push: '$relationships' },
            }
        }
    ]);
}


export async function searchTerms(text, { semanticTags, languageCode }) {
    const conditions = {
        languageCode: 'spanish',
        conceptActive: true,
        active: true
    };
    // Filtramos por semanticTag
    if (semanticTags && semanticTags.length > 0) {
        conditions['$or'] = [...[], semanticTags].map((i) => { return { semanticTag: i }; });
    }

    // creamos un array de palabras a partir de la separacion del espacio
    text = text.toLowerCase();
    // Busca por palabras
    conditions['$and'] = [];
    const words = text.split(' ');
    words.forEach((word) => {
        // normalizamos cada una de las palabras como hace SNOMED para poder buscar palabra a palabra
        word = word.replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08').replace('ñ', 'n');
        const expWord = '^' + utils.removeDiacritics(word) + '.*';

        // agregamos la palabra a la condicion
        conditions['$and'].push({ words: { $regex: expWord } });
    });


    // preparamos query
    const query = TextIndexModel.find(conditions, {
        _id: 0,
        conceptId: 1,
        term: 1,
        fsn: 1,
        semanticTag: 1,
        refsetIds: 1
    });
    query.limit(10000);
    query.sort({ term: 1 });

    let conceptos = await query;

    conceptos = conceptos.filter((i: any) => i.term !== i.fsn);
    return conceptos.sort((a: any, b: any) => {
        if (a.term.length < b.term.length) { return -1; }
        if (a.term.length > b.term.length) { return 1; }
        return 0;
    });
}
