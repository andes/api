import { institucion, IInstitucion } from './institucion.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class InstitucionResource extends ResourceBase<IInstitucion>  {
    Model = institucion;
    resourceName = 'institucion';
    keyId = '_id';
    searchFileds = {
        nombre: MongoQuery.partialString,
        detalle: MongoQuery.partialString,
        tipo: MongoQuery.partialString,
        contacto: {
            field: 'contacto.valor',
            fn: MongoQuery.partialString
        },
        direccion: {
            field: 'direccion.valor',
            fn: MongoQuery.partialString
        },
        activo: MongoQuery.equalMatch,
        search: ['_id', 'nombre', 'detalle', 'tipo', 'customFieldContacto', 'customFieldDireccion']
    };
}

export const InstitucionCtr = new InstitucionResource({});
export const InstitucionRouter = InstitucionCtr.makeRoutes();
