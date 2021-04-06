import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { FormsEpidemiologia } from './forms-epidemiologia-schema';

class FormsEpidemiologiaResource extends ResourceBase {
    Model = FormsEpidemiologia;
    resourceName = 'formEpidemiologia';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        type: MongoQuery.partialString,
        search: ['identifier'],
        fechaCondicion: MongoQuery.matchDate.withField('createdAt'),
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        }
    };
}

export const FormEpidemiologiaCtr = new FormsEpidemiologiaResource();
export const FormEpidemiologiaRouter = FormEpidemiologiaCtr.makeRoutes();
