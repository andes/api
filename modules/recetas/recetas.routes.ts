import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { buscarRecetas, getMotivosReceta, setEstadoDispensa, suspender, actualizarAppNotificada, rechazar } from './recetasController';
import { ParamsIncorrect, RecetaNotFound } from './recetas.error';

class RecetasResource extends ResourceBase {
    Model = Receta;
    resourceName = 'recetas';
    routesEnable = ['get, patch'];
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


export const patch = async (req, res) => {
    const operacion = req.body.op ? req.body.op.toLowerCase() : '';
    let result, status;
    const { recetaId, recetas } = req.body;
    const app = req.user.app?.nombre ? req.user.app.nombre.toLowerCase() : '';
    if (!recetaId && !recetas) {
        const error = new ParamsIncorrect();
        res.status(error.status).json(error);
    } else {
        switch (operacion) {
            case 'suspender':
                result = await suspender(recetas, req);
                break;
            case 'dispensar':
            case 'dispensa-parcial':
                result = await setEstadoDispensa(req, operacion, app);
                break;
            case 'sin-dispensar': result = await actualizarAppNotificada(recetaId, app, req);
                break;
            default: const error = new ParamsIncorrect();
                status =
                    res.status(error.status).json(error);
        }
        if (result) {
            status = result?.status || 200;
            res.status(status).json(result);
        }
    }
};

export const RecetasCtr = new RecetasResource({});
export const RecetasRouter = RecetasCtr.makeRoutes();

const authorizeByToken = async (req: Request, res: Response, next) =>
    Auth.authorizeByToken(req, res, next, ['huds:visualizacionHuds', 'recetas:read']);

RecetasRouter.use(Auth.authenticate());
RecetasRouter.get('/recetas', authorizeByToken, asyncHandler(get));
RecetasRouter.get('/recetas/motivos', asyncHandler(getMotivos));
RecetasRouter.patch('/recetas', authorizeByToken, asyncHandler(patch));
