import { Perfiles } from './perfil.schema';
import { Auth } from '../../auth/auth.class';

import { MongoQuery, ResourceBase } from '@andes/core';
import { Request } from '@andes/api-tool';


class PerfilesResource extends ResourceBase {
    Model = Perfiles;
    resourceName = 'perfiles';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('usuarios:read'),
        search: Auth.authorize('usuarios:read'),
        post: Auth.authorize('usuarios:perfiles'),
        patch: Auth.authorize('usuarios:perfiles'),
        delete: Auth.authorize('usuarios:perfiles'),
    };
    searchFileds = {
        nombre: MongoQuery.partialString,
        // equivalente a { organizacion: { $in: [ null, value ] } }
        organizacion: (value) => {
            return { $in: [null, value] };
        },
        // equivalente a { activo: value }
        activo: (value) => {
            return value;
        },
        search: ['nombre', 'activo']
    };

    public async prefind(data: Object, req: Request) {
        const orgId = Auth.getOrganization(req);
        return {
            organizacion: { $in: [null, orgId] }
        };
    }
}

export const PerfilesCtr = new PerfilesResource({});

export const PerfilesRouter = PerfilesCtr.makeRoutes();
