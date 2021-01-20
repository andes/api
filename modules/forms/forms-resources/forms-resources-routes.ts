import { FormResource } from './forms-resources-schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';

class FormResourceResource extends ResourceBase {
    Model = FormResource;
    resourceName = 'resources';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        activo: MongoQuery.partialString,
        key: MongoQuery.equalMatch,
        search: ['nombre', 'key']
    };
}

export const FormResourceCtr = new FormResourceResource();
export const FormResourcesRouter = FormResourceCtr.makeRoutes();
