import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { FormPresetResource } from './forms-preset-resources-schema';

class FormPresetResourceResource extends ResourceBase {
    Model = FormPresetResource;
    resourceName = 'preset-resources';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        activo: MongoQuery.partialString,
        id: MongoQuery.equalMatch,
        type: MongoQuery.partialString,
        search: ['nombre', 'id', 'type']
    };
}

export const FormPresetResourceCtr = new FormPresetResourceResource();
export const FormPresetResourcesRouter = FormPresetResourceCtr.makeRoutes();
