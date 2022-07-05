import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Constantes } from './constantes.schema';

class ConstantesController extends ResourceBase {
    Model = Constantes;
    resourceName = 'constantes';
    middlewares = [Auth.authenticate()];
    routesEnable = ['get', 'search'];
    searchFileds = {
        key: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        source: MongoQuery.equalMatch,
        type: MongoQuery.equalMatch
    };
}

export const ConstantesCtr = new ConstantesController({});
export const ConstantesRouter = ConstantesCtr.makeRoutes();
