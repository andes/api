import { institucion } from './institucion.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';


class InstitucionResource extends ResourceBase {
    Model = institucion;
    resourceName = 'institucion';
    keyId = '_id';
    searchFileds = {
        search: (value) => {
            return {
                nombre: (text: string) => new RegExp(`^${text}`)
            };
        },
    };
}

export const InstitucionCtr = new InstitucionResource({});
export const InstitucionRouter = InstitucionCtr.makeRoutes();
