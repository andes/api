import { AndesServices } from '@andes/services';
import { validar } from './core-v2/mpi/validacion';
import { Types } from 'mongoose';
import { Connections } from './connections';
import * as express from 'express';
import { renaperToAndes, renaperv3 } from '@andes/fuentes-autenticas';
import { busInteroperabilidad } from './config.private';
import { asyncHandler } from '@andes/api-tool';
import { hudsPaciente } from './modules/rup';

export let services: AndesServices;

export function setupServices(app: express.Express) {
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

    services.register('huds-registros', async (_config, params) => {
        const { paciente, expression, first } = params;
        const sort = params.sort || -1;
        const registros = await hudsPaciente(paciente, expression, null, 'validada', null);
        registros.sort(
            (a, b) => sort * (b.fecha.getTime() - a.fecha.getTime())
        );
        return first ? registros[0] : registros;
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
