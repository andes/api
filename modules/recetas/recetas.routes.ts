import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { buscarRecetas, getMotivosReceta, setEstadoDispensa, suspender, actualizarAppNotificada, cancelarDispensa, create, buscarRecetasPorProfesional, buscarRecetasConFiltros } from './recetasController';
import { ParamsIncorrect } from './recetas.error';

class RecetasResource extends ResourceBase {
    Model = Receta;
    resourceName = 'recetas';
    routesEnable = ['get, patch, post'];
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
    const result = await buscarRecetas(req);
    res.json(result);
};

export const getMotivos = async (req, res) => {
    const result = await getMotivosReceta(req);
    res.json(result);
};

export const getByProfesional = async (req, res) => {
    const result = await buscarRecetasPorProfesional(req);
    res.json(result);
};

export const getConFiltros = async (req, res) => {
    const result = await buscarRecetasConFiltros(req);
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
            case 'sin-dispensar': result = await actualizarAppNotificada(recetaId, app, req);
                break;
            case 'cancelar-dispensa':
                result = await cancelarDispensa(recetaId, dataDispensa, app, req);
                break;
            default: const error = new ParamsIncorrect();
                status = res.status(error.status).json(error);
        }
        if (result) {
            status = result?.status || 200;
            res.status(status).json(result);
        }
    }
};

export const post = async (req, res) => {
    const resp = await create(req);
    const status = resp?.status || resp?.errors || 200;
    res.status(status).json(resp);
};

export const RecetasCtr = new RecetasResource({});
export const RecetasRouter = RecetasCtr.makeRoutes();

const authorizeByToken = async (req: Request, res: Response, next) =>
    Auth.authorizeByToken(req, res, next, [
        'huds:visualizacionHuds',
        'huds:visualizacionParcialHuds:laboratorio',
        'huds:visualizacionParcialHuds:vacuna',
        'huds:visualizacionParcialHuds:receta',
        'huds:visualizacionParcialHuds:*',
        'recetas:read'
    ]);

RecetasRouter.use(Auth.authenticate());
RecetasRouter.get('/recetas', authorizeByToken, asyncHandler(get));
RecetasRouter.get('/recetas/motivos', asyncHandler(getMotivos));
RecetasRouter.get('/recetas/profesional/:id', authorizeByToken,asyncHandler(getByProfesional));
RecetasRouter.get('/recetas/filtros', authorizeByToken, asyncHandler(getConFiltros));
RecetasRouter.patch('/recetas', authorizeByToken, asyncHandler(patch));
RecetasRouter.post('/recetas', authorizeByToken, asyncHandler(post));
