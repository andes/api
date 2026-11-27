import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { buscarRecetas, getMotivosReceta, setEstadoDispensa, suspender, actualizarAppNotificada, cancelarDispensa, create, buscarRecetasPorProfesional, buscarRecetasConFiltros, verificarRecetaExistente } from './recetasController';
import { ParamsIncorrect } from './recetas.error';
import { recetarClient, isRecetarConfigured } from './recetar-client';

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
    const extra = await fetchRecetar(req);
    res.json(extra ? mergeResult(result, extra) : result);
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
    const extra = await fetchRecetar(req);
    res.json(extra ? mergeResult(result, extra) : result);
};

// Lee las recetas nuevas desde RecetAr (fuente de verdad) para mergear con las historicas de ANDES.
async function fetchRecetar(req: any): Promise<any[] | null> {
    if (!isRecetarConfigured()) {
        return null;
    }
    const documento = req.query?.documento;
    if (!documento) {
        return null;
    }
    try {
        const estado = req.query.estado || req.query.status;
        return await recetarClient.getRecetas({ documento, estado, ambito: req.query.ambito });
    } catch (err) {
        return null;
    }
}

function mergeResult(result: any, extra: any[]): any {
    if (Array.isArray(result)) {
        return [...extra, ...result];
    }
    if (result && Array.isArray(result.data)) {
        return { ...result, data: [...extra, ...result.data] };
    }
    return result;
}

export const getVerificarReceta = async (req, res) => {
    try {
        const { documento, sexo, esMagistral, codigoFuente, codigoValor, conceptId } = req.query;
        if (!documento || !sexo) {
            const error = new ParamsIncorrect('Se requieren los parámetros documento y sexo');
            return res.status(error.status).json(error);
        }
        const medicamento: any = {
            esMagistral,
            codigoFuente,
            codigoValor,
            conceptId

        };
        const result = await verificarRecetaExistente(documento as string, sexo as string, medicamento);
        res.json(result);
    } catch (err) {
        const status = (err as any).status || 400;
        res.status(status).json(err);
    }
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
                if (isRecetarConfigured()) {
                    try {
                        const proxied = await recetarClient.patchReceta({ op: 'suspender', recetaId, motivo: req.body.motivo, observacion: req.body.observacion, sistema: app });
                        if (proxied) {
                            return res.status(200).json(proxied);
                        }
                    } catch (err) {
                        // fallback a la coleccion local de ANDES (historicas)
                    }
                }
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
RecetasRouter.get('/recetas/filtros', authorizeByToken, asyncHandler(getConFiltros));
RecetasRouter.get('/recetas/profesional/:id', authorizeByToken, asyncHandler(getByProfesional));
RecetasRouter.get('/recetas/verificar', authorizeByToken, asyncHandler(getVerificarReceta));
RecetasRouter.get('/recetas/:id', authorizeByToken, asyncHandler(get));
RecetasRouter.patch('/recetas', authorizeByToken, asyncHandler(patch));
RecetasRouter.post('/recetas', authorizeByToken, asyncHandler(post));
