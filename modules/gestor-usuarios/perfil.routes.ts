import { Perfiles } from './perfil.schema';
import { Auth } from '../../auth/auth.class';

import { ResourceBase } from '@andes/core';
import { Request } from '@andes/api-tool';


class PerfilesResource extends ResourceBase {
    Model = Perfiles;
    resourceName = 'perfiles';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('usuarios:read'),
        search: Auth.authorize('usuarios:read'),
        post: Auth.authorize('usuarios:perfiles:write'),
        patch: Auth.authorize('usuarios:perfiles:write'),
        delete: Auth.authorize('usuarios:perfiles:write'),
    };
    searchFileds = {
        // equivalente a { organizacion: { $in: [ null, value ] } }
        organizacion: (value) => {
            return { $in: [null, value] };
        },
        // equivalente a { activo: value }
        activo: (value) => {
            return value;
        }
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
