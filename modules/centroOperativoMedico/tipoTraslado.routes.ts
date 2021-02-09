import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { TipoTraslado } from './schemas/tipoTraslado.schema';

class TipoTrasladoResource extends ResourceBase {
    Model = TipoTraslado;
    resourceName = 'tipoTraslado';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
    };
}

export const TipoTrasladoCtr = new TipoTrasladoResource({});
export const TipoTrasladoRouter = TipoTrasladoCtr.makeRoutes();
