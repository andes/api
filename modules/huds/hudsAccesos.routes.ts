import * as mongoose from 'mongoose';
import { HudsAcceso } from './hudsAccesos.schema';
import { Auth } from '../../auth/auth.class';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Request } from '@andes/api-tool';


class HudsAccesoResource extends ResourceBase {
    Model = HudsAcceso;
    resourceName = 'huds-accesos';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('log:get'),
        post: Auth.authorize('log:post'),
        patch: Auth.authorize('log:post')
    };
    searchFileds = {
        paciente: {
            field: 'paciente',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
        turno: {
            field: 'turno',
            fn: (value) => mongoose.Types.ObjectId(value)
        }
    };
}
export const HudsAccesoCtr = new HudsAccesoResource({});
export const HudsAccesoRouter = HudsAccesoCtr.makeRoutes();

HudsAccesoRouter.post('/huds-token', Auth.authenticate(), (req, res, next) => {
    return res.json({ token: Auth.generateHudsToken() });
});
