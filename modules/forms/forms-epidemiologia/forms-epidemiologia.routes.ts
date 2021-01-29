import { MongoQuery, ResourceBase } from '@andes/core';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';
import { Auth } from '../../../auth/auth.class';

class FormsEpidemiologiaResource extends ResourceBase {
    Model = FormsEpidemiologia;
    resourceName = 'formEpidemiologia';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        type: MongoQuery.partialString,
        search: ['type'],
        createdAt: {
            field: 'createdAt',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        paciente: {
            field: 'paciente._id',
            fn: MongoQuery.equalMatch
        },
    };
}

export const FormEpidemiologiaCtr = new FormsEpidemiologiaResource();
export const FormEpidemiologiaRouter = FormEpidemiologiaCtr.makeRoutes();
