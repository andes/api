import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import { Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotFound } from './recetas.error';
import moment = require('moment');

export async function BuscarRecetas(req) {
    const options = {};
    const params = req.params.id ? req.params : req.query;

    try {
        const paramMap = {
            id: '_id',
            pacienteId: 'paciente.id',
            documento: 'paciente.documento',
            estado: 'estadoActual.tipo',
            estadoDispensa: 'estadoDispensaActual.tipo',
            sistema: 'sistema'
        };

        Object.keys(paramMap).forEach(key => {
            if (params[key]) {
                options[paramMap[key]] = key === 'id' ? Types.ObjectId(params[key]) : params[key];
            }
        });

        if (params.fechaInicio || params.fechaFin) {
            const fechaInicio = params.fechaInicio ? moment(params.fechaInicio).startOf('day').toDate() : moment().subtract(1, 'years').startOf('day').toDate();
            const fechaFin = params.fechaFin ? moment(params.fechaFin).endOf('day').toDate() : moment().endOf('day').toDate();

            options['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
        }

        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }

        const recetas: any = await Receta.find(options);

        if (!recetas) { throw new RecetaNotFound(); }

        if (params.sistema) {
            for (const receta of recetas) {
                const appNotificada = { app: params.sistema, fecha: moment().toDate() };
                receta.appNotificada.push(appNotificada);
                Auth.audit(receta, userScheduler as any);
                await receta.save();
            }
        }

        return recetas;
    } catch (err) {
        return err;
    }
}
