import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Insumo } from './insumos-schema';

class InsumosResource extends ResourceBase {
    Model = Insumo;
    resourceName = 'insumos';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: (value: any) => {
            if (value && value.charAt(0) === '^') {
                const searchPattern = value.substring(1);
                const escaped = searchPattern.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');
                return { $regex: escaped, $options: 'i' };
            }
            return value;
        },
        tipo: MongoQuery.inArray,
        requiereEspecificacion: MongoQuery.equalMatch,
    };
}


export const InsumosCtr = new InsumosResource({});
export const InsumosRouter = InsumosCtr.makeRoutes();
