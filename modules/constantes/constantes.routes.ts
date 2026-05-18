import { MongoQuery, ResourceBase } from '@andes/core';
import { Request, Response } from '@andes/api-tool';
import { Auth } from '../../auth/auth.class';
import { Constantes } from './constantes.schema';

class ConstantesController extends ResourceBase {
    Model = Constantes;
    resourceName = 'constantes';
    middlewares = [Auth.authenticate()];
    routesEnable = ['get', 'search', 'put'];
    searchFileds = {
        key: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        source: MongoQuery.equalMatch,
        type: MongoQuery.equalMatch
    };
    extrasRoutes = [
        {
            path: 'next/:source',
            callback: 'next'
        }
    ];

    public async next(this: ConstantesController, req: Request, res: Response) {
        try {
            const source = req.params.source;
            const constante = await Constantes.findOneAndUpdate(
                { source },
                { $inc: { valor: 1 } },
                { new: true, upsert: false }
            );
            if (!constante) {
                return res.status(404).json({ message: 'Constante no encontrada' });
            }
            return res.json(constante);
        } catch (err) {
            return res.status(500).json(err);
        }
    }
}

export const ConstantesCtr = new ConstantesController({});
export const ConstantesRouter = ConstantesCtr.makeRoutes();
