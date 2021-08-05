import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { FormResource } from './forms-resources-schema';

class FormResourceResource extends ResourceBase {
    Model = FormResource;
    resourceName = 'resources';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        activo: MongoQuery.partialString,
        id: MongoQuery.equalMatch,
        type: MongoQuery.partialString,
        search: ['nombre', 'id', 'type']
    };
}

export const FormResourceCtr = new FormResourceResource();
export const FormResourcesRouter = FormResourceCtr.makeRoutes();
