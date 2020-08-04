import { MongoQuery, ResourceBase } from '@andes/core';
import { Categoria } from '../schemas/categoria';

class CategoriaResource extends ResourceBase {
    Model = Categoria;
    resourceName = 'categoria';
    keyId = '_id';
    searchFileds = {
        titulo: MongoQuery.partialString,
        expresionSnomed: MongoQuery.equalMatch,
        busquedaPor: {
            field: 'busquedaPor',
            fn: (value) => {
                return { $in: value };
            }
        }
    };
}
export const CategoriaCtr = new CategoriaResource({});
module.exports = CategoriaCtr.makeRoutes();
