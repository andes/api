import { Parentesco } from './parentesco.schema';
import { MongoQuery } from '@andes/core';
import { ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';

class ParentescoResource extends ResourceBase {
    Model = Parentesco;
    resourceName = 'parentescos';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('mpi:paciente:parentesco')
    };
    searchFileds = {
        nombre: MongoQuery.partialString,
        search: ['nombre']
    };
}

export const ParentescoCtr = new ParentescoResource({});
export const ParentescoRouter = ParentescoCtr.makeRoutes();

