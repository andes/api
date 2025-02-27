import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import { MotivosReceta, Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotFound } from './recetas.error';
import moment = require('moment');

async function notificarApp(req, recetas) {
    const token = req.headers.authorization?.substring(4) || req.query.token;
    const decodedToken = Auth.decode(token);

    if (decodedToken.type === 'app-token') {
        const sistema = decodedToken.app.nombre.toLowerCase();

        for (const receta of recetas) {
            receta.appNotificada = [{ app: sistema, fecha: moment().toDate() }];

            Auth.audit(receta, userScheduler as any);
            await receta.save();
        }
    }
}
export async function buscarRecetas(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;

    try {
        const paramMap = {
            id: '_id',
            pacienteId: 'paciente.id',
            documento: 'paciente.documento',
            sexo: 'paciente.sexo',
            estado: 'estadoActual.tipo'
        };

        Object.keys(paramMap).forEach(key => {
            if (params[key]) {
                options[paramMap[key]] = key === 'id' ? Types.ObjectId(params[key]) : params[key];
            }
        });

        if (params.estadoDispensa) {
            const estadoDispensaArray = params.estadoDispensa.split(',');
            options['estadoDispensaActual.tipo'] = { $in: estadoDispensaArray };
        }

        if (params.fechaInicio || params.fechaFin) {
            const fechaInicio = params.fechaInicio ? moment(params.fechaInicio).startOf('day').toDate() : moment().subtract(1, 'years').startOf('day').toDate();
            const fechaFin = params.fechaFin ? moment(params.fechaFin).endOf('day').toDate() : moment().endOf('day').toDate();

            options['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
        }

        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }

        const today = moment().startOf('day').toDate();
        options.$or = [
            { 'estadoActual.tipo': { $ne: 'vencida' } },
            { 'estadoActual.tipo': 'vencida', 'estadoActual.createdAt': { $gte: moment(today).subtract(30, 'days').toDate() } }
        ];

        const recetas: any = await Receta.find(options);

        if (!recetas) { throw new RecetaNotFound(); }

        notificarApp(req, recetas);

        return recetas;
    } catch (err) {
        return err;
    }
}

export async function suspender(req) {
    try {
        const recetas = req.body.recetas;
        const motivo = req.body.motivo;
        const observacion = req.body.observacion;
        const profesional = req.body.profesional;

        if (!recetas) {
            throw new ParamsIncorrect();
        }

        const promises = recetas.map(async (recetaId) => {
            const receta: any = await Receta.findById(recetaId);

            if (!receta) {
                throw new RecetaNotFound();
            }

            receta.estados.push({
                tipo: 'suspendida',
                motivo,
                observacion,
                profesional,
                fecha: new Date()
            });

            Auth.audit(receta, userScheduler as any);
            await receta.save();
        });

        await Promise.all(promises);

        return { success: true };
    } catch (err) {
        return err;
    }
}

export async function getMotivosReceta(res) {
    try {
        const motivos = await MotivosReceta.find({});

        if (!motivos) { throw new RecetaNotFound(); }

        return motivos;
    } catch (err) {
        return err;
    }
}

export async function setEstadoDispensa(req) {
    try {
        const operacion = req.body.op;
        const dispensa = req.body.dispensa;

        const { recetaId } = req.body;

        if (!recetaId) {
            throw new ParamsIncorrect();
        }

        const receta: any = await Receta.findById(recetaId);

        if (!receta) {
            throw new RecetaNotFound();
        }

        const operacionMap = {
            dispensar: 'dispensada',
            'dispensa-parcial': 'dispensa-parcial',
            rechazar: 'rechazada'
        };

        const tipo = operacionMap[operacion];

        if (!tipo) {
            throw new ParamsIncorrect();
        }

        if (operacion === 'dispensar' && dispensa) {
            const estadoReceta = { tipo: 'finalizada' };

            receta.dispensa.push(dispensa);
            receta.estados.push(estadoReceta);
            receta.estadoActual = estadoReceta;
        }

        receta.estadosDispensa.push({
            tipo,
            fecha: new Date(),
            sistema: req.body.sistema
        });

        Auth.audit(receta, userScheduler as any);
        await receta.save();

        return { success: true };
    } catch (err) {
        return err;
    }
}
