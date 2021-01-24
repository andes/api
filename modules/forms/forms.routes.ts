import { MongoQuery, ResourceBase } from '@andes/core';
import { Forms } from './forms.schema';
import { Auth } from '../../auth/auth.class';
class FormsResource extends ResourceBase {
    Model = Forms;
    resourceName = 'formulario';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {};
    searchFileds = {
        name: MongoQuery.partialString,
        type: MongoQuery.partialString,
        active: MongoQuery.equalMatch,
        search: ['name', 'type'],
        sections: {
            field: 'sections.id',
            fn: value => value
        }
    };
}

export const FormCtr = new FormsResource();
export const FormRouter = FormCtr.makeRoutes();
