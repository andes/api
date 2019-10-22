
import { pacienteApp } from '../schemas/pacienteApp';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';

class PacienteAppResource extends ResourceBase {
    Model = pacienteApp;
    resourceName = 'pacienteApp';
    keyId = '_id';
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
module.exports = PacienteAppCtr.makeRoutes();
