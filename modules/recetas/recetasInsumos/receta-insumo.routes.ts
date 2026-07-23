import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { RecetaInsumo } from './receta-insumo.schema';
import { asyncHandler, Request, Response } from '@andes/api-tool';
import { create, buscarRecetasInsumos, buscarRecetasInsumosConFiltros, setEstadoDispensa, actualizarAppNotificada, cancelarDispensa, suspender } from './recetaInsumosController';
import { ParamsIncorrect } from '../recetas.error';

class RecetaInsumoResource extends ResourceBase {
    Model = RecetaInsumo;
    resourceName = 'recetaInsumos';
    routesEnable = ['get, post, patch'];
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

export const get = async (req, res) => {
    const result = await buscarRecetasInsumos(req);
    res.json(result);
};

export const getConFiltros = async (req, res) => {
    const result = await buscarRecetasInsumosConFiltros(req);
    res.json(result);
};

export const patch = async (req, res) => {
    const operacion = req.body.op ? req.body.op.toLowerCase() : '';
    let result, status;
    const { recetaId, recetas, dataDispensa } = req.body;
    const app = req.user.app?.nombre ? req.user.app.nombre.toLowerCase() : '';
    if ((!recetaId && !recetas)) {
        const error = new ParamsIncorrect();
        res.status(error.status).json(error);
    } else {
        switch (operacion) {
            case 'suspender':
                result = await suspender(recetaId, req);
                break;
            case 'dispensar':
            case 'dispensa-parcial':
                result = await setEstadoDispensa(req, operacion, app);
                break;
            case 'sin-dispensar':
                result = await actualizarAppNotificada(recetaId, app, req);
                break;
            case 'cancelar-dispensa':
                result = await cancelarDispensa(recetaId, dataDispensa, app, req);
                break;
            default:
                const error = new ParamsIncorrect();
                status = res.status(error.status).json(error);
        }
        if (result) {
            status = result?.status || 200;
            res.status(status).json(result);
        }
    }
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
RecetaInsumoRouter.get('/recetasInsumos', authorizeByToken, asyncHandler(get));
RecetaInsumoRouter.get('/recetasInsumos/filtros', authorizeByToken, asyncHandler(getConFiltros));
RecetaInsumoRouter.post('/recetasInsumos', authorizeByToken, asyncHandler(post));
RecetaInsumoRouter.patch('/recetasInsumos', authorizeByToken, asyncHandler(patch));

