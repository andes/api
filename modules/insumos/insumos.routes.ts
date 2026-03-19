import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Insumo } from './insumos-schema';

class InsumosResource extends ResourceBase {
    Model = Insumo;
    resourceName = 'insumos';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        termino: (value) => {
            return {
                $or: [
                    { nombre: { $regex: value, $options: 'i' } },
                    { 'codigo.valor': { $regex: value, $options: 'i' } }
                ]
            };
        },
        'codigo.valor': MongoQuery.partialString,
        tipo: MongoQuery.equalMatch,
        estado: MongoQuery.equalMatch,
        requiereEspecificacion: MongoQuery.equalMatch,
    };
}


export const InsumosCtr = new InsumosResource({});
export const InsumosRouter = InsumosCtr.makeRoutes();
