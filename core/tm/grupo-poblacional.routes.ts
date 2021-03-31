import { MongoQuery, ResourceBase } from '@andes/core';
import { GrupoPoblacional } from './schemas/grupo-poblacional.schema';

class GrupoPoblacionalResource extends ResourceBase {
    Model = GrupoPoblacional;
    resourceName = 'grupo-poblacional';
    searchFileds = {
        search: ['nombre'],
        nombre: {
            field: 'nombre',
            fn: (value) => {
                return { $in: value };
            }
        },
        descripcion: MongoQuery.partialString,
        activo: MongoQuery.equalMatch
    };
}
export const GrupoPoblacionalCtr = new GrupoPoblacionalResource({});
export const GrupoPoblacionalRouter = GrupoPoblacionalCtr.makeRoutes();
