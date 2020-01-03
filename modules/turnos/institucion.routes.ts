import { institucion, IInstitucion } from './institucion.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class InstitucionResource extends ResourceBase<IInstitucion>  {
    Model = institucion;
    resourceName = 'institucion';
    keyId = '_id';
    searchFileds = {
        _id: MongoQuery.partialString,
        nombre: MongoQuery.partialString,
        detalle: MongoQuery.partialString,
        tipo: MongoQuery.partialString,
        customFieldContacto: {
            field: 'contacto.valor',
            fn: MongoQuery.partialString
        },
        customFieldDireccion: {
            field: 'direccion.valor',
            fn: MongoQuery.partialString
        },
        activo: MongoQuery.equalMatch,
        search: ['_id', 'nombre', 'detalle', 'tipo', 'customFieldContacto', 'customFieldDireccion']
    };
}

export const InstitucionCtr = new InstitucionResource({});
export const InstitucionRouter = InstitucionCtr.makeRoutes();
