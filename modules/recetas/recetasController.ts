import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { searchMatriculas } from '../../core/tm/controller/profesional';
import { MotivosReceta, Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotFound, RecetaNotEdit } from './recetas.error';
import * as moment from 'moment';
import { handleHttpRequest } from './../../utils/requestHandler';


async function notificarApp(req, recetas) {
    const token = req.headers.authorization?.substring(4) || req.query.token;
    const decodedToken = Auth.decode(token);
    let recetasPaciente = [];
    if (decodedToken.type === 'app-token') {
        const sistema = decodedToken.app.nombre.toLowerCase();
        recetasPaciente = recetas.map(async receta => {
            // for (let receta of recetas) {
            const appN = { app: sistema, fecha: moment().toDate() };
            const arrayApps = receta.appNotificada;
            if (arrayApps.length) {
                // receta ya enviada a algún sistema
                const i = arrayApps.findIndex(a => a.app === sistema);
                if (i !== -1) {
                    // mismo sistema
                    arrayApps[i].fecha = moment().toDate();
                } else {
                    // otro sistema, se verifica dispensa
                    let recetaDisp = null;
                    if (sistema !== 'recetar') {
                        recetaDisp = await getRecetar(receta.id);

                        const tipo = recetaDisp.estadoDispensa?.tipo;
                        const dispensada = tipo !== 'sin-dispensa';
                        if (dispensada) {
                            receta = await dispensar(receta, tipo, recetaDisp.dispensa, sistema);
                        } else {
                            // eliminar appNotificada el sistema
                            receta.appNotificada = receta.appNotificada.filter(a => a.app !== 'recetar');
                            receta.appNotificada.push(appN);
                        }
                    }
                }
            } else {
                receta.appNotificada.push(appN);
            }
            Auth.audit(receta, req);
            await receta.save();
        });
        return await Promise.all(recetasPaciente);
    }
    return [];
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

        await notificarApp(req, recetas);

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

        let receta: any = await Receta.findById(recetaId);
        if (!receta) {
            throw new RecetaNotFound();
        }

        if (receta.estadoActual.tipo !== 'vigente') {
            throw new RecetaNotEdit(receta.estadoActual.tipo);
        }
        receta = await dispensar(receta, operacion, dataDispensa, sistema);

        Auth.audit(receta, req);
        await receta.save();

    } catch (error) {
        return error;
    }
}

async function dispensar(receta, operacion, dataDispensa, sistema) {

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

    return receta;
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

                    // loguear no dispensa
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

export async function rechazar(idReceta, sistema, req) {
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
                Auth.audit(receta, req);
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
export async function getRecetar(idReceta) {
    try {
        const token = Recetar.token;
        if (idReceta && token && Recetar.url) {

            const url = `${Recetar.url}/api/andes-prescriptions/?id=${idReceta}`;
            const options = {
                url,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };
            const [status, res] = await handleHttpRequest(options);
            const receta = res;
            if (status === 200 && receta) {
                return {
                    id: receta.id,
                    dispensa: receta.dispensa,
                    estadoDispensa: receta.estadoDispensaActual
                };
            }
        }
    } catch (error) {
        return null;
    }
    return null;
}

export async function cancelarDispensa(idReceta, dataDispensa, sistema, req) {
    try {
        const idDispensa = dataDispensa.idDispensa;
        const motivo = dataDispensa.motivo;
        const organizacion = dataDispensa.organizacion;
        const idValido = idReceta && Types.ObjectId.isValid(idReceta);
        if (idValido && idDispensa) {
            const receta: any = await Receta.findById(idReceta);
            if (!receta) {
                throw new RecetaNotFound();
            }
            const estadoActual = receta.estadoActual.tipo;
            const estadoDispensa = receta.estadoDispensaActual.tipo;
            if (estadoDispensa !== 'sin-dispensa') {
                const tipo = (receta.estadoActual.tipo === 'finalizada') ? calcularEstadoReceta(receta) : receta.estadoActual.tipo;
                const estadoReceta = { tipo };
                receta.estados.push(estadoReceta);

                receta.dispensa = receta.dispensa.filter(disp => disp.idDispensaApp !== idDispensa);
                const tipoDispensa = (receta.dispensa.length) ? 'dispensa-parcial' : 'sin-dispensa';
                receta.estadosDispensa.push({
                    tipo: tipoDispensa,
                    fecha: new Date(),
                    sistema,
                    cancelada: {
                        idDispensaApp: idDispensa,
                        motivo,
                        organizacion
                    }
                });

                receta.appNotificada = receta.appNotificada.filter(a => a.app !== sistema);
                // loguear cancelar dispensa
                Auth.audit(receta, req);
                return await receta.save();

            } else {
                throw new RecetaNotEdit(`No se puede cancelar dispensa de una receta ${estadoActual} no dispensada`);
            }
        } else {
            throw new ParamsIncorrect();
        }
    } catch (error) {
        return error;
    }
}

export async function calcularEstadoReceta(receta) {
    const fActual = moment();
    const fRegistro = moment(receta.fechaRegistro).startOf('day');
    const dias = fRegistro.diff(fActual, 'd');

    return (dias > 30) ? 'vencida' : 'vigente';
}


