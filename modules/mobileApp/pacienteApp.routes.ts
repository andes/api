
import { PacienteApp } from './schemas/pacienteApp';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class PacienteAppResource extends ResourceBase {
    Model = PacienteApp;
    resourceName = 'pacienteApp';
    keyId = '_id';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        documento: MongoQuery.partialString,
        email: MongoQuery.partialString,
        sexo: MongoQuery.partialString,
        search: ['documento']
    };
}

export const PacienteAppCtr = new PacienteAppResource({});
export const PacienteAppRouter = PacienteAppCtr.makeRoutes();
