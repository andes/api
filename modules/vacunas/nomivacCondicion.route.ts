import { MongoQuery, ResourceBase } from '@andes/core';
import { nomivacCondicion } from './schemas/nomivacCondicion.schema';
import { Auth } from '../../auth/auth.class';

class NomivacCondicionResource extends ResourceBase {
    Model = nomivacCondicion;
    resourceName = 'nomivacCondiciones';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString
    };
}

export const nomivacCondicionCtr = new NomivacCondicionResource({});
export const nomivacCondicionRouter = nomivacCondicionCtr.makeRoutes();
