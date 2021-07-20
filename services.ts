import { asyncHandler } from '@andes/api-tool';
import { renaperToAndes, renaperv3 } from '@andes/fuentes-autenticas';
import { AndesServices } from '@andes/services';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { Types } from 'mongoose';
import { busInteroperabilidad } from './config.private';
import { AppCache, Connections } from './connections';
import { PacienteCtr } from './core-v2/mpi/paciente/paciente.routes';
import { validar } from './core-v2/mpi/validacion';
import { hudsPaciente } from './modules/rup';
import { sincronizarVacunas } from './modules/vacunas/controller/vacunas.events';

export let services: AndesServices;

export function setupServices(app: express.Express = null) {
    services = new AndesServices(
        Connections.main,
        Connections.logs,
        {},
        AppCache
    );

    services.addFunction('toObjectId', (id) => {
        return new Types.ObjectId(id);
    });

    services.register('validar-paciente', async (_config, params) => {
        return await validar(params.documento, params.sexo);
    });

    services.register('paciente-vacunacion-registrar', async (_config, params) => {
        const { paciente } = params;
        return await sincronizarVacunas(paciente);
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
        if (first) {
            return registros[0] || null;
        }
        return registros;
    });

    services.register('obtener-paciente', async (_config, params) => {
        const idPaciente = mongoose.Types.ObjectId(params.id);
        const paciente = await PacienteCtr.findById(idPaciente);
        return paciente.toObject({ virtuals: true });
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

    if (app) {
        app.get('/api/services/:id', asyncHandler(httpRequestHandler));
        app.post('/api/services/:id', asyncHandler(httpRequestHandler));
    }

    return services;
}
