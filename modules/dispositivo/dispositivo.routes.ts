import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Dispositivo } from './dispositivo.schema';

class DispositivoResource extends ResourceBase {
    Model = Dispositivo;
    resourceName = 'dispositivo';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        tipo: MongoQuery.partialString,
        activo: MongoQuery.equalMatch,
    };
}

export const DispositivoCtr = new DispositivoResource({});
export const DispositivoRouter = DispositivoCtr.makeRoutes();
