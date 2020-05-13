import { Institucion, IInstitucion } from './institucion.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class InstitucionResource extends ResourceBase<IInstitucion>  {
    Model = Institucion;
    resourceName = 'institucion';
    searchFileds = {
        nombre: MongoQuery.partialString,
        tipo: MongoQuery.partialString,
        activo: MongoQuery.equalMatch,
        contacto: {
            field: 'contacto.valor',
            fn: MongoQuery.partialString
        },
        direccion: {
            field: 'direccion.valor',
            fn: MongoQuery.partialString
        },
        search: ['nombre']
    };
}

export const InstitucionCtr = new InstitucionResource({});
export const InstitucionRouter = InstitucionCtr.makeRoutes();
