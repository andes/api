import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { EstrategiaAtencion } from './schemas/estrategiasAtencion.schema';

class EstrategiaAtencionController extends ResourceBase {
    Model = EstrategiaAtencion;
    resourceName = 'estrategiaAtencion';
    middlewares = [Auth.authenticate()];
    routesEnable = ['get', 'search'];
    searchFileds = {
        key: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        source: MongoQuery.equalMatch,
        type: MongoQuery.equalMatch
    };
}

export const EstrategiaAtencionCtr = new EstrategiaAtencionController({});
export const EstrategiaAtencionRouter = EstrategiaAtencionCtr.makeRoutes();
