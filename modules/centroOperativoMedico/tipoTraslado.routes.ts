import { TipoTraslado } from './schemas/tipoTraslado.schema';
import { ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class TipoTrasladoResource extends ResourceBase {
    Model = TipoTraslado;
    resourceName = 'tipoTraslado';
    middlewares = [Auth.authenticate()];
}

export const TipoTrasladoCtr = new TipoTrasladoResource({});
export const TipoTrasladoRouter = TipoTrasladoCtr.makeRoutes();
