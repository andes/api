import { SnomedModel } from '../schemas/snomed';
import { makeMongoQuery } from './grammar/parser';

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
        if (rel.active === true && (parent && rel.type.conceptId === IsASct) && (!parent && rel.type.conceptId !== IsASct)) {
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

// "characteristicType.conceptId": "900000000000010007"

export async function contextFilter(options) {
    const conditions = {};
    if (options.attributes) {
        const attributes = options.attributes;
        const conds = [];
        for (const elem of attributes) {
            const filters = {
                active: true
            };
            if (elem.sctid) {
                if (!elem.descendientes) {
                    filters['destination.conceptId'] = elem.sctid;
                } else {
                    filters['destination.conceptId'] = {
                        $in: await getChildren(elem.sctid, { all: true, completed: false })
                    };
                }
            }
            if (elem.typeid) {
                filters['type.conceptId'] = elem.typeid;
            }
            conds.push(filters);
        }
        conditions['relationships'] = {
            $elemMatch: conds
        };
    }

    if (options.leaf) {
        conditions['isLeafInferred'] = true;
        conditions['isLeafStated'] = true;
    }

    if (options.childOf) {
        conditions['$or'] = [
            { inferredAncestors: options.childOf },
            { statedAncestors: options.childOf }
        ];
    }

    return SnomedModel.find(conditions);
}

export async function getConceptByExpression(expression) {
    const query = makeMongoQuery(expression);
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

export async function getConcepts(conceptsIds) {
    return SnomedModel.aggregate([
        { $match:  { conceptId: { $in :  conceptsIds } } },
        { $unwind: '$relationships' },
        { $match:  {
            'relationships.active': true,
            'relationships.characteristicType.conceptId': '900000000000010007',
            'relationships.type.conceptId': '116680003' }
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
