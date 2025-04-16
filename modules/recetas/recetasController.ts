import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { searchMatriculas } from '../../core/tm/controller/profesional';
import { MotivosReceta, Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotFound, RecetaNotEdit } from './recetas.error';
import * as moment from 'moment';
import { getReceta } from './services/receta';


async function actualizarAppNotificadas(req, recetas) {
    const token = req.headers.authorization?.substring(4) || req.query.token;
    const decodedToken = Auth.decode(token);
    let recetasPaciente = [];
    if (decodedToken.type === 'app-token') {
        const sistema = decodedToken.app.nombre.toLowerCase();
        recetasPaciente = recetas.map(async receta => {
            let incluirReceta = true;
            const appN = { app: sistema, fecha: moment().toDate() };
            const arrayApps = receta.appNotificada;
            if (arrayApps.length) {
                // receta ya enviada a algún sistema
                let indiceApp = arrayApps.findIndex(a => a.app === sistema);
                if (indiceApp !== -1) {
                    // mismo sistema
                    arrayApps[indiceApp].fecha = moment().toDate();
                } else {
                    // otro sistema, se verifica dispensa
                    indiceApp = arrayApps.findIndex(a => a.app !== sistema);
                    const sistema2 = arrayApps[indiceApp].app;
                    const recetaDisp = await getReceta(receta.id, sistema2);
                    if (!recetaDisp) {
                        return null;
                    }
                    const tipo = recetaDisp.tipoDispensaActual;
                    const dispensada = ['dispensada', 'dispensa-parcial'].includes(tipo);
                    if (dispensada) {
                        recetaDisp.dispensa.forEach(async (dispensa, index) => {
                            const estadoDispensa = (recetaDisp.dispensa.length - 1) !== index ? 'dispensa-parcial' : tipo;
                            receta = await dispensar(receta, estadoDispensa, dispensa, sistema2);
                        });
                        incluirReceta = false;
                    } else {
                        // actualizar appNotificada
                        if (tipo === 'sin-dispensa') {
                            receta.appNotificada = arrayApps.filter(a => a.app !== sistema2);
                            receta.appNotificada.push(appN);
                        } else {
                            // receta en uso por app
                            receta.appNotificada[indiceApp].fecha = moment().toDate();
                            incluirReceta = false;
                        }
                    }
                }
            } else {
                receta.appNotificada.push(appN);
                incluirReceta = true;
            }
            Auth.audit(receta, req);
            await receta.save();
            return incluirReceta ? receta : null;
        });
        const recetasUpdated = await Promise.all(recetasPaciente);
        return recetasUpdated.filter(r => r !== null);
    }
    return [];
}

export async function buscarRecetas(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;
    const fechaVencimiento = moment().subtract(30, 'days').startOf('day').toDate();
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
        } else {
            options['estadoDispensaActual.tipo'] = 'sin-dispensa';
        }

        if (params.fechaInicio || params.fechaFin) {
            const fechaInicio = params.fechaInicio ? moment(params.fechaInicio).startOf('day').toDate() : moment().subtract(1, 'years').startOf('day').toDate();
            const fechaFin = params.fechaFin ? moment(params.fechaFin).endOf('day').toDate() : moment().endOf('day').toDate();
            options['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
        }
        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }
        if (params.estado === 'vigente') {
            options['fechaRegistro'] = { $gte: fechaVencimiento };
        }
        const recetas: any = await Receta.find(options);
        if (!recetas) {
            return [];
        }
        return await actualizarAppNotificadas(req, recetas);

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

/**
 * Se actualiza información de aplicaciones notificadas con una receta vigente, no dispensada
 * @param idReceta a actualizar
 * @param sistema sifaho o recetar
 * @param req usado para audit
 * @returns
 */
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


