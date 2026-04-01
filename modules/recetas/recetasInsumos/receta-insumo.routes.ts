import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { RecetaInsumo } from './receta-insumo.schema';
import { asyncHandler, Request, Response } from '@andes/api-tool';
import { create } from './recetaInsumosController';

class RecetaInsumoResource extends ResourceBase {
    Model = RecetaInsumo;
    resourceName = 'recetaInsumo';
    routesEnable = ['get, post'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        documento: {
            field: 'paciente.documento',
            fn: MongoQuery.equalMatch
        }
    };
}

export const post = async (req, res) => {
    const resp = await create(req);
    const status = resp?.status || resp?.errors || 200;
    res.status(status).json(resp);
};
export const RecetaInsumoCtr = new RecetaInsumoResource({});
export const RecetaInsumoRouter = RecetaInsumoCtr.makeRoutes();

const authorizeByToken = async (req: Request, res: Response, next) =>
    Auth.authorizeByToken(req, res, next, [
        'huds:visualizacionHuds',
        'huds:visualizacionParcialHuds:laboratorio',
        'huds:visualizacionParcialHuds:vacuna',
        'huds:visualizacionParcialHuds:receta',
        'huds:visualizacionParcialHuds:*',
        'recetas:read'
    ]);

RecetaInsumoRouter.use(Auth.authenticate());
RecetaInsumoRouter.post('/recetasInsumos', authorizeByToken, asyncHandler(post));
