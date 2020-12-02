
import { ElementoRUP } from './schemas/elementoRUP';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class ElementoRUPResource extends ResourceBase {
    Model = ElementoRUP;
    resourceName = 'elementos-rup';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        activo: MongoQuery.equalMatch,
        componente: MongoQuery.equalMatch,
        defaultFor: MongoQuery.equalMatch,
        tipo: MongoQuery.equalMatch,
        esSolicitud: MongoQuery.equalMatch,
        concepto: {
            field: 'conceptos.conceptId',
            fn: MongoQuery.equalMatch
        },
        term: {
            field: 'conceptos.term',
            fn: MongoQuery.partialString
        },
    };
}


export const ElementoRUPCtr = new ElementoRUPResource({});
export const ElementoRUPRouter = ElementoRUPCtr.makeRoutes();
