import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { RecetaNotFound } from './recetas.error';
import { BuscarRecetas } from './recetasController';
import { asyncHandler } from '@andes/api-tool';

class RecetasResource extends ResourceBase {
    Model = Receta;
    resourceName = 'recetas';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('recetas:read'),
        patch: Auth.authorize('recetas:write')
    };
    routesEnable = ['patch'];
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

export const RecetasCtr = new RecetasResource({});
export const RecetasRouter = RecetasCtr.makeRoutes();

export const get = async (req, res) => {
    try {
        const receta = await BuscarRecetas(req);
        if (receta) {
            res.json(receta);
        }
        throw new RecetaNotFound();
    } catch (err) {
        return res.json(err);
    }
};

RecetasRouter.use(Auth.authenticate());
RecetasRouter.get('/recetas', Auth.authorize('recetas:read'), asyncHandler(get));
RecetasRouter.get('/recetas/:id', Auth.authorize('recetas:read'), asyncHandler(get));
