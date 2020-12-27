import { MongoQuery, ResourceBase } from '@andes/core';
import { nomivacCategoria } from './schemas/nomivacCategoria.schema';
import { Auth } from '../../auth/auth.class';

class NomivacCategoriaResource extends ResourceBase {
    Model = nomivacCategoria;
    resourceName = 'nomivacCategorias';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString
    };
}

export const nomivacCategoriaCtr = new NomivacCategoriaResource({});
export const nomivacCategoriaRouter = nomivacCategoriaCtr.makeRoutes();
