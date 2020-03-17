
import { pacienteApp } from './schemas/pacienteApp';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class PacienteAppResource extends ResourceBase {
    Model = pacienteApp;
    resourceName = 'pacienteApp';
    keyId = '_id';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        documento: MongoQuery.partialString,
        search: (value) => {
            return {
                $or: [
                    { documento: MongoQuery.partialString(value) }
                ]
            };
        }
    };
}


export const PacienteAppCtr = new PacienteAppResource({});
export const PacienteAppRouter = PacienteAppCtr.makeRoutes();
