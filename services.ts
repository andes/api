import { AndesServices } from '@andes/services';
import { validar } from './core-v2/mpi/validacion';
import { Types } from 'mongoose';
import { Connections } from './connections';
import * as express from 'express';
import { renaperToAndes, renaperv3 } from '@andes/fuentes-autenticas';
import { busInteroperabilidad } from './config.private';
import { asyncHandler } from '@andes/api-tool';

export let services: AndesServices;

export function setupServicies(app: express.Express) {
    services = new AndesServices(
        Connections.main,
        Connections.logs
    );

    services.addFunction('toObjectId', (id) => {
        return new Types.ObjectId(id);
    });

    services.register('validar-paciente', async (_config, params) => {

        return await validar(params.documento, params.sexo);

    });

    services.register('renaper-bus-interoperabilidad', async (_config, params) => {
        const { documento, sexo } = params;
        return await renaperv3({ documento, sexo }, busInteroperabilidad, renaperToAndes);
    });

    // app.get('/api/services/:id/info', asyncHandler(async (req, res) => {
    //     const name = req.params.id;
    //     const response = await services.get(name).info();
    //     return res.json(response);
    // }));


    const httpRequestHandler = async (req, res, next) => {
        const name = req.params.id;
        const params = req.method === 'GET' ? req.query : req.body;

        const servicio = services.get(name);
        const info = await servicio.info();

        if (!info.externo) {
            return next(404);
        }

        if (info.auth && !req.user) {
            return next(403);
        }

        const response = await servicio.exec(params);
        return res.json(response);

    };


    app.get('/api/services/:id', asyncHandler(httpRequestHandler));
    app.post('/api/services/:id', asyncHandler(httpRequestHandler));

    return services;
}
