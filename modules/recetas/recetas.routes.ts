import { asyncHandler, Request, Response } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { Receta } from './receta-schema';
import { buscarRecetas, getMotivosReceta, setEstadoDispensa, suspender } from './recetasController';

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
    switch (req.body.op) {
        case 'suspender':
            const result = await suspender(req);
            return res.json(result);
        case 'dispensar':
        case 'dispensa-parcial':
        case 'rechazar':
            const resultDispensa = await setEstadoDispensa(req);
            return res.json(resultDispensa);
        default:
            return res.status(400).json({ error: 'Operación no soportada' });
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
