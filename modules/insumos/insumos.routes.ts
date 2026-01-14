import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Insumo } from './insumos-schema';

class InsumosResource extends ResourceBase {
    Model = Insumo;
    resourceName = 'insumos';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        nombre: MongoQuery.partialString,
        tipo: MongoQuery.equalMatch,
        requiereEspecificacion: MongoQuery.equalMatch,
    };
}


export const InsumosCtr = new InsumosResource({});
export const InsumosRouter = InsumosCtr.makeRoutes();

