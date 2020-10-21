
import { MongoQuery, ResourceBase } from '@andes/core';
import { Modulos } from './schemas/modulos.schema';

class ModuloResource extends ResourceBase {
    Model = Modulos;
    resourceName = 'modulos';
    searchFileds = {
        search: ['nombre'],
        nombre: MongoQuery.partialString,
        descripcion: MongoQuery.partialString,
        color: MongoQuery.partialString,
        subtitulo: MongoQuery.partialString,
        activo: MongoQuery.equalMatch,
        orden: MongoQuery.equalMatch,
        permisos: {
            field: 'permisos',
            fn: (value) => {
                return { $in: value };
            }
        }
    };
}
export const ModulosCtr = new ModuloResource({});
export const ModulosRouter = ModulosCtr.makeRoutes();
