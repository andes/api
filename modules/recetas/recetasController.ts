import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import { searchMatriculas } from '../../core/tm/controller/profesional';
import { MotivosReceta, Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotEdit, RecetaNotFound } from './recetas.error';
import moment = require('moment');


async function notificarApp(req, recetas) {
    const token = req.headers.authorization?.substring(4) || req.query.token;
    const decodedToken = Auth.decode(token);

    if (decodedToken.type === 'app-token') {
        const sistema = decodedToken.app.nombre.toLowerCase();

        for (const receta of recetas) {
            receta.appNotificada = [{ app: sistema, fecha: moment().toDate() }];

            Auth.audit(receta, req);
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

export async function suspender(recetas, req) {
    try {

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
            Auth.audit(receta, req);
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

export async function setEstadoDispensa(req, operacion, app) {
    try {
        const dataDispensa = req.body.dispensa;

        const { recetaId } = req.body;
        const sistema = app || '';
        if (!recetaId && sistema) {
            throw new ParamsIncorrect();
        }

        const receta: any = await Receta.findById(recetaId);

        if (!receta) {
            throw new RecetaNotFound();
        }

        if (receta.estadoActual.tipo !== 'vigente') {
            throw new RecetaNotEdit(receta.estadoActual.tipo);
        }

        const operacionMap = {
            dispensar: 'dispensada',
            'dispensa-parcial': 'dispensa-parcial'
        };

        const tipoDispensa = operacionMap[operacion] || null;
        const idDispensaApp = dataDispensa.id;
        if (!tipoDispensa || !dataDispensa || !idDispensaApp) {
            throw new ParamsIncorrect();
        }

        const dispensa: any = { idDispensaApp };
        const tipo = (operacion === 'dispensar') ? 'finalizada' : receta.estadoActual.tipo;
        const estadoReceta = { tipo };
        dispensa.fecha = dataDispensa.fecha ? moment(dataDispensa.fecha).toDate() : moment().toDate();
        let medicamentos = [];
        if (dataDispensa?.medicamentos?.length) {
            medicamentos = dataDispensa.medicamentos.map(med => {
                const medicamento: any = {};
                if (med.medicamento) {
                    medicamento.medicamento = med.medicamento || {};
                    medicamento.descripcion = (med.medicamento.nombre || '') + (med.cantidadEnvases || '');
                }
                medicamento.unidades = med.unidades || null;
                medicamento.cantidad = med.cantidad || null;
                medicamento.cantidadEnvases = med.cantidadEnvases || null;
                medicamento.presentacion = med.presentacion || null;
                return medicamento;
            });
            dispensa.medicamentos = medicamentos;
        }
        dispensa.organizacion = dataDispensa.organizacion || null;
        receta.dispensa.push(dispensa);
        receta.estados.push(estadoReceta);
        receta.estadoActual = estadoReceta;


        receta.estadosDispensa.push({
            tipo: tipoDispensa,
            fecha: new Date(),
            sistema
        });

        Auth.audit(receta, req);
        await receta.save();

        return receta;
    } catch (error) {
        return error;
    }
}
export async function actualizarAppNotificada(idReceta, sistema, req) {
    try {
        if (idReceta && Types.ObjectId.isValid(idReceta)) {
            const receta: any = await Receta.findById(idReceta);
            if (!receta) {
                throw new RecetaNotFound();
            }
            const estadoActual = receta.estadoActual.tipo;
            const estadoDispensa = receta.estadoDispensaActual.tipo;
            if (estadoActual === 'vigente' && estadoDispensa === 'sin-dispensa') {
                const app = receta.appNotificada.find(a => a.app === sistema);
                if (app) {
                    receta.appNotificada = receta.appNotificada.filter(a => a.app !== sistema);

                    Auth.audit(receta, req);
                    return await receta.save();
                } else {
                    throw new RecetaNotEdit(`${sistema.toUpperCase()} no puede marcar sin-dispensa una receta no consultada`);
                }
            } else {
                const motivo = {
                    'sin-dispensa': '',
                    'dispensa-parcial': ' con dispensa parcial',
                    dispensada: ' dispensada',
                };
                throw new RecetaNotEdit(`No se puede marcar sin-dispensar una receta ${estadoActual + motivo[estadoDispensa]}`);
            }
        }
    } catch (error) {
        return error;
    }
}

export async function rechazar(idReceta, sistema) {
    try {
        if (idReceta && Types.ObjectId.isValid(idReceta)) {
            const receta: any = await Receta.findById(idReceta);
            if (!receta) {
                throw new RecetaNotFound();
            }
            const estadoActual = receta.estadoActual.tipo;
            if (estadoActual === 'vigente') {
                const tipo = 'rechazada';
                receta.estados.push({ tipo });
                Auth.audit(receta, userScheduler as any);
                await receta.save();
                return receta;
            } else {
                throw new RecetaNotEdit(`${sistema.toUpperCase()} no puede rechazar la receta id ${idReceta} con estado ${estadoActual}`);
            }
        } else {
            throw new ParamsIncorrect();
        }
    } catch (error) {
        return error;
    }
}

export async function getProfesionActualizada(profesional) {
    let profesionGrado = '';
    let matriculaGrado = 0;
    let especialidades = '';

    const infoMatriculas = await searchMatriculas(profesional.id);

    if (infoMatriculas) {
        // Los codigos de los roles permitidos son los de las profesiones: Médico, Odontólogo y Obstetra respectivamente.
        const rolesPermitidos = [1, 2, 23];
        const formacionEncontrada = infoMatriculas.formacionGrado?.find(formacion =>
            rolesPermitidos.includes(formacion.profesion)
        );

        profesionGrado = formacionEncontrada?.nombre;
        matriculaGrado = formacionEncontrada?.numero;

        const especialidadesTxt = infoMatriculas.formacionPosgrado
            ?.map(({ nombre, numero }) => `${nombre} (Mat. ${numero})`);

        especialidades = especialidadesTxt?.join(', ') || especialidades;
    }

    return { profesionGrado, matriculaGrado, especialidades };
}
