import { MongoQuery, ResourceBase } from '@andes/core';
import { tipoPrestacion } from '../schemas/tipoPrestacion';
class ConceptoTurneableResource extends ResourceBase {
    Model = tipoPrestacion;
    resourceName = 'conceptoTurneable';
    keyId = '_id';
    searchFileds = {
        conceptId: MongoQuery.partialString,
        term: MongoQuery.partialString,
        fsn: MongoQuery.partialString,
        semanticTag: MongoQuery.partialString,
        search: (value) => {
            return {
                $or: [
                    { conceptId: MongoQuery.partialString(value) },
                    { term: MongoQuery.partialString(value) },
                    { fsn: MongoQuery.partialString(value) },
                    { semanticTag: MongoQuery.partialString(value) }
                ]
            };
        }
    };
}
export const ConceptoTurneableCtr = new ConceptoTurneableResource({});
module.exports = ConceptoTurneableCtr.makeRoutes();
export const ConceptoTurneableRouter = ConceptoTurneableCtr.makeRoutes();
