import { asyncHandler, Request, Response } from '@andes/api-tool';

import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { BuscarRecetas } from './recetasController';


class RecetasResource extends ResourceBase {
    Model = Receta;
    resourceName = 'recetas';
    routesEnable = ['get'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        documento: {
            field: 'paciente.documento',
            fn: MongoQuery.equalMatch
        },
        estado: {
            field: 'estados.tipo',
            fn: MongoQuery.equalMatch
        }
    };
}

export const get = async (req, res) => {
    try {
        const receta = await BuscarRecetas(req);

        res.json(receta);
    } catch (err) {
        return res.json(err);
    }
};

export const RecetasCtr = new RecetasResource({});
export const RecetasRouter = RecetasCtr.makeRoutes();

RecetasRouter.get('/recetas', Auth.authorize('recetas:read'), asyncHandler(get));
