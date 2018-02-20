import { textIndexModel, snomedModel } from '../schemas/snomed';

// ID del atributo que genera una relación padre-hijo
const IsASct = '116680003';
const StatedSct = '900000000000010007';
const InferredSct = '900000000000011006';

/**
 * Obtiene un objeto concepto a partir del conceptId
 *
 * @param sctid ConceptId
 */
export function getConcept(sctid) {
    return new Promise((resolve, reject) => {
        snomedModel.findOne({ conceptId: sctid }).then((concept: any) => {
            if (concept) {
                return resolve(concept);
            }
            return reject('not_found');
        }).catch(reject);
    });
}

/**
 * Filtra las relaciones de un concepto
 * [TODO] Filtros de atributos y también por estados (stated y inferred)
 *
 * @param {conceptMoldel} concept Concepto completo
 */
export function filterRelationships(concept, { parent = true }) {
    let result = [];
    let relationships = concept.relationships;
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
    for (let rel of concept.relationships) {
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
export function getChilds(sctid, { all = false, completed = true, leaf = false } ) {
    let query;
    if (all) {
        query = {
            '$or': [
                { 'inferredAncestors': sctid },
                { 'statedAncestors': sctid }
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
    return snomedModel.find(query).then((concepts: any[]) => {
        let result = [];
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
    });
}

// "characteristicType.conceptId": "900000000000010007"

export async function contextFilter (options) {
    let conditions = {};
    if (options.attributes) {
        let attributes = options.attributes;
        let conds = [];
        for (let elem of attributes) {
            let filters = {
                active: true
            };
            if (elem.sctid) {
                if (!elem.descendientes) {
                    filters['destination.conceptId'] = elem.sctid;
                } else {
                    filters['destination.conceptId'] = {
                        $in: await getChilds(elem.sctid, { all: true, completed: false })
                    };
                }
            }
            if (elem.typeid) {
                filters['type.conceptId'] = elem.typeid;
            }
            conds.push(filters);
        }
        conditions['relationships'] =  {
                $elemMatch: conds
        };
    }

    if (options.leaf) {
        conditions['isLeafInferred'] = true;
        conditions['isLeafStated'] = true;
    }

    if (options.childOf) {
        conditions['$or'] = [
            { 'inferredAncestors': options.childOf },
            { 'statedAncestors': options.childOf }
        ];
    }

    return snomedModel.find(conditions);
}
