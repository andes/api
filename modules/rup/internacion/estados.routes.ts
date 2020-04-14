import { Estados } from './estados.schema';
import { Auth } from '../../../auth/auth.class';
import { ResourceBase, MongoQuery } from '@andes/core';

class EstadosResource extends ResourceBase {
    Model = Estados;
    resourceName = 'estados';
    middlewares = [Auth.authenticate()];
    // routesAuthorization = {
    //     get: Auth.authorize('usuarios:perfiles:?'),
    //     search: Auth.authorize('usuarios:perfiles:?'),
    //     post: Auth.authorize('usuarios:perfiles:write'),
    //     patch: Auth.authorize('usuarios:perfiles:write'),
    //     delete: Auth.authorize('usuarios:perfiles:write'),
    // };
    searchFileds = {
        organizacion: MongoQuery.matchString,
        ambito: MongoQuery.matchString,
        capa: MongoQuery.matchString,
        estado: {
            field: 'estados.key',
            fn: MongoQuery.matchString
        },
    };

    public async encontrar(organizacion, ambito, capa) {
        const elementos = await this.search({ organizacion, ambito, capa }, {}, null);
        if (elementos.length > 0) {
            return elementos[0];
        }

        return null;
    }
}

export const EstadosCtr = new EstadosResource({});
export const EstadosRouter = EstadosCtr.makeRoutes();
