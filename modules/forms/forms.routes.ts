import { MongoQuery, ResourceBase } from '@andes/core';
import { Forms } from './forms.schema';
// import { authenticate, checkPermission } from '../application';

class FormsResource extends ResourceBase {
    Model = Forms;
    resourceName = 'formulario';
    middlewares = [];
    routesAuthorization = {};
    searchFileds = {
        name: MongoQuery.partialString,
        type: MongoQuery.partialString,
        active: MongoQuery.equalMatch,
        search: ['name', 'type'],
        fields: {
            field: 'fields.key',
            fn: value => value
        }
    };
}

export const FormCtr = new FormsResource();
export const FormRouter = FormCtr.makeRoutes();
