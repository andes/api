import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Semaforo } from './semaforo.schema';

class SemaforoResource extends ResourceBase {
    Model = Semaforo;
    resourceName = 'semaforo';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        name: MongoQuery.equalMatch
    };
}

export const SemaforoCtr = new SemaforoResource({});
export const SemaforoRouter = SemaforoCtr.makeRoutes();
