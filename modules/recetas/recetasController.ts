import { Types } from 'mongoose';
import { RecetaNotFound, ParamsIncorrect } from './recetas.error';
import { Receta } from './receta-schema';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import moment = require('moment');

export async function BuscarRecetas(req) {

    const options = {};
    const params = req.params.id ? req.params : req.query;
    try {
        if (params.id) {
            Object.assign(options, { _id: Types.ObjectId(params.id) });
        } else {
            if (params.pacienteId) {
                Object.assign(options, { 'paciente.id': Types.ObjectId(params.pacienteId) });
            } else {
                if (params.documento) {
                    Object.assign(options, { 'paciente.documento': params.documento });
                } else {
                    throw new ParamsIncorrect();
                }
            }
        }
        Object.assign(options, { estadoActual: 'vigente' });

        const recetas: any = await Receta.find(options);

        if (recetas) {
            for (const receta of recetas) {
                const appNotificada = { app: req.body.app, fecha: moment().toDate() };
                receta.appNotificada.push(appNotificada);
                Auth.audit(receta, userScheduler as any);
                await receta.save();
            }
            return recetas;
        }
        throw new RecetaNotFound();
    } catch (err) {
        return err;
    }
}
