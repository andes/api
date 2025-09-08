import * as moment from 'moment';
import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import { searchMatriculas } from '../../core/tm/controller/profesional';
import { RecetasParametros } from './parametros.schema';
import { createLog, informarLog, updateLog, jobsLog } from './recetaLogs';
import { MotivosReceta, Receta } from './receta-schema';
import { ParamsIncorrect, RecetaNotEdit, RecetaNotFound } from './recetas.error';
import { getReceta } from './services/receta';


async function registrarAppNotificadas(req, recetas, sistema) {
    const pacienteId = recetas[0].paciente.id;
    let recetasPaciente = [];
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
                const recetaDisp = await getReceta(Types.ObjectId(receta.id), pacienteId, sistema2);
                if (recetaDisp) {
                    const tipo = recetaDisp.tipoDispensaActual;
                    const dispensada = ['dispensada', 'dispensa-parcial'].includes(tipo);
                    if (dispensada) {
                        recetaDisp.dispensas.forEach(async d => {
                            receta = d.estado ? await dispensar(receta, d.estado, d.dispensa, sistema2) : receta;
                        });
                        incluirReceta = false;
                    } else {
                        // actualizar appNotificada
                        if (tipo === 'sin-dispensa') {
                            receta.appNotificada = arrayApps.filter(a => a.app !== sistema2);
                            receta.appNotificada.push(appN);
                        } else {
                            // receta en uso por app tipo="receta-en-uso"
                            receta.appNotificada[indiceApp].fecha = moment().toDate();
                            incluirReceta = false;
                        }
                    }
                } else {
                    incluirReceta = false;
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

export async function buscarRecetas(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;
    const fechaVencimiento = moment().subtract(30, 'days').startOf('day').toDate();
    const pacienteId = params.pacienteId || null;
    const documento = params.documento || null;
    const sexo = params.sexo || null;
    try {
        if ((!pacienteId && (!documento || !sexo)) || (pacienteId && !Types.ObjectId.isValid(pacienteId))) {
            throw new ParamsIncorrect();
        }
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
        let recetas: any = await Receta.find(options);
        if (!recetas.length) {
            return [];
        }
        const user = req.user;

        if (user.type === 'app-token') {
            // si es un usuario de app y no tiene nombre de sistema asignado, no se envia recetas
            const sistema = user.app.nombre.toLowerCase();
            recetas = sistema ? await registrarAppNotificadas(req, recetas, sistema) : [];
        }
        return recetas;
    } catch (err) {
        await informarLog.error('buscarRecetas', { params, options }, err, req);
        return err;
    }
}

async function cambiarEstadoRecetas(recetasIds: string[], estado: any, profesionalReceta: any, organizacion?: any) {
    if (!recetasIds || recetasIds.length === 0) {
        throw new ParamsIncorrect();
    }

    const promises = recetasIds.map(async (recetaId) => {
        const receta: any = await Receta.findById(recetaId);

        if (!receta) {
            throw new RecetaNotFound();
        }

        if (estado.tipo === 'vigente') {
            const profesion = await getDatosProfesion(profesionalReceta);

            receta.profesional = {
                id: profesionalReceta.id,
                nombre: profesionalReceta.nombre,
                apellido: profesionalReceta.apellido,
                documento: profesionalReceta.documento,
                profesion: profesion.profesionGrado,
                especialidad: profesion.especialidades,
                matricula: profesion.matriculaGrado,
            };

            receta.organizacion = organizacion;
        }

        const estadoNuevo = {
            ...estado,
            fecha: new Date()
        };

        if (estado.tipo === 'suspendida') {
            estadoNuevo.profesional = {
                id: profesionalReceta.id,
                nombre: profesionalReceta.nombre,
                apellido: profesionalReceta.apellido,
                documento: profesionalReceta.documento,
            };
        }

        receta.estados.push(estadoNuevo);

        receta.estadoActual = {
            tipo: estado.tipo,
            fecha: new Date()
        };

        if (organizacion) {
            receta.organizacion = organizacion;
        }

        Auth.audit(receta, userScheduler as any);
        await receta.save();
    });

    await Promise.all(promises);
}


export async function suspender(recetas, req) {
    const motivo = req.body.motivo;
    const observacion = req.body.observacion;
    const profesional = req.body.profesional;
    try {
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

            const idRegistro = receta.idRegistro;
            const medicamento = receta.medicamento?.concepto.conceptId;
            await Receta.deleteMany({ idRegistro, 'medicamento.concepto.conceptId': medicamento, 'estadoActual.tipo': 'pendiente' });

        });

        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        await updateLog.error('suspender', { motivo, observacion, profesional, recetas }, error);
        return error;
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
    const { recetaId } = req.body;
    const sistema = app || '';
    const dataDispensa = req.body.dispensa;
    try {
        if (!recetaId && sistema) {
            throw new ParamsIncorrect();
        }

        let receta: any = await Receta.findById(recetaId);
        if (!receta) {
            throw new RecetaNotFound();
        }

        receta = await dispensar(receta, operacion, dataDispensa, sistema);

        Auth.audit(receta, req);
        return await receta.save();


    } catch (error) {
        await updateLog.error('setEstadoDispensa', { operacion, sistema, recetaId, dataDispensa }, error);
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
    // controlar que la dispensa no exista ya cargada en la receta
    const dispensaExistente = receta.dispensa.find(d => d.idDispensaApp === idDispensaApp);
    if (!dispensaExistente) {
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

        receta.estadosDispensa.push({
            tipo: tipoDispensa,
            idDispensaApp,
            fecha: dispensa.fecha,
            sistema
        });
    }
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
                    Auth.audit(receta, req);
                    await receta.save();
                    await updateLog.info('sin-dispensar', { sistema, idReceta, receta });
                    return receta;

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
        await updateLog.error('actualizarAppNotificada', { sistema, idReceta }, error);
        return error;
    }
}

/** Rechazo de una receta por farmacia
 *
 */
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
        await updateLog.error('rechazar', { sistema, idReceta }, error);
        return error;
    }
}

export async function getDatosProfesion(profesional) {
    let infoMatriculas = null;
    let profesionGrado = '';
    let matriculaGrado = 0;
    let especialidades = '';

    if (profesional.formacionPosgrado) {
        infoMatriculas = {
            formacionGrado: profesional.formacionGrado,
            formacionPosgrado: profesional.formacionPosgrado,
        };
    } else {
        infoMatriculas = await searchMatriculas(profesional.id);
    }

    // Los codigos de los roles permitidos son los de las profesiones: Médico, Odontólogo y Obstetra respectivamente.
    const rolesPermitidos = [1, 2, 23];
    const formacionEncontrada = infoMatriculas.formacionGrado?.find(formacion => rolesPermitidos.includes(formacion.profesion.codigo || formacion.profesion));

    profesionGrado = formacionEncontrada?.nombre || formacionEncontrada.profesion.nombre;
    matriculaGrado = formacionEncontrada?.numero || formacionEncontrada.matriculacion[formacionEncontrada.matriculacion.length - 1].matriculaNumero;

    const especialidadesTxt = infoMatriculas.formacionPosgrado
        ?.map(({ especialidad: { nombre }, matriculacion }) => `${nombre} (Mat. ${matriculacion[0].matriculaNumero})`);

    especialidades = especialidadesTxt?.join(', ') || especialidades;

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
                const tipo = (receta.estadoActual.tipo === 'finalizada') ? await calcularEstadoReceta(receta) : receta.estadoActual.tipo;
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
                Auth.audit(receta, req);
                await receta.save();
                await updateLog.info('cancelarDispensa', { sistema, idReceta, dataDispensa });
                return receta;

            } else {
                throw new RecetaNotEdit(`No se puede cancelar dispensa de una receta ${estadoActual} no dispensada`);
            }
        } else {
            throw new ParamsIncorrect();
        }
    } catch (error) {
        await updateLog.error('cancelarDispensa', { sistema, idReceta, dataDispensa }, error);
        return error;
    }
}

export async function calcularEstadoReceta(receta) {
    const fActual = moment();
    const fRegistro = moment(receta.fechaRegistro).startOf('day');
    const dias = fRegistro.diff(fActual, 'd');
    const parametro: any = await RecetasParametros.findOne({ key: 'fechaLimite' });
    const days = (parametro && parametro.value) ? Number(parametro.value) : 30;
    return (dias > days) ? 'vencida' : 'vigente';
}


export async function crearReceta(req) {
    const reqBody = req.body;
    const sistema = req.user.app?.nombre.toLowerCase();
    const receta: any = new Receta();

    try {
        const idPrestacion = reqBody.idPrestacion;
        const idRegistro = reqBody.idRegistro;
        const fechaRegistro = reqBody.fechaRegistro;
        const fechaPrestacion = reqBody.fechaPrestacion;
        const idRecetaOriginal = reqBody.idRecetaOriginal;
        const paciente = reqBody.paciente;
        const profesional = reqBody.profesional;
        const organizacion = reqBody.organizacion;
        const medicamento = reqBody.medicamento;
        const diagnostico = medicamento.diagnostico;


        if (!idPrestacion || !idRegistro || !medicamento || !paciente || !profesional || !organizacion) {
            throw new ParamsIncorrect();
        }

        receta.diagnostico = (typeof diagnostico === 'string') ? { descripcion: diagnostico } : diagnostico;
        receta.idPrestacion = idPrestacion;
        receta.idRegistro = idRegistro;
        receta.diagnostico = (typeof diagnostico === 'string') ? { descripcion: diagnostico } : diagnostico;
        receta.medicamento = {
            concepto: medicamento.concepto,
            presentacion: medicamento.presentacion,
            unidades: medicamento.unidades,
            cantidad: medicamento.cantidad,
            cantEnvases: medicamento.cantEnvases,
            dosisDiaria: {
                dosis: medicamento.dosisDiaria.dosis,
                intervalo: medicamento.dosisDiaria.intervalo,
                dias: medicamento.dosisDiaria.dias,
                notaMedica: medicamento.dosisDiaria.notaMedica
            },
            tratamientoProlongado: medicamento.tratamientoProlongado,
            tiempoTratamiento: medicamento.tiempoTratamiento,
            tipoReceta: medicamento.tipoReceta || 'simple'
        };

        receta.estados = [{ tipo: 'vigente' }];
        receta.estadoActual = { tipo: 'vigente' };
        receta.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
        receta.estadoDispensaActual = { tipo: 'sin-dispensa', fecha: moment().toDate() };
        receta.paciente = paciente;
        receta.profesional = profesional;
        receta.organizacion = organizacion;
        receta.idRecetaOriginal = idRecetaOriginal;
        receta.fechaRegistro = fechaRegistro ? new Date(fechaRegistro) : moment().toDate();
        receta.fechaPrestacion = fechaPrestacion ? new Date(fechaPrestacion) : new Date(fechaRegistro);
        receta.origenExterno = {
            id: reqBody.origenExterno.id || '',
            app: sistema || '',
            fecha: reqBody.origenExterno.fecha || null,
        };

        receta.audit(userScheduler);
        await receta.save();

        return receta;
    } catch (err) {
        createLog.error('crearReceta', { reqBody, receta }, err, req);
        return err;
    }
}


/**
 * Actualiza estado de recetas:
 * pendientes pasan a estado vigentes y
 * vigentes pasan a estado vencidas.
 *
 */
export async function actualizarEstadosRecetas(done) {
    let totalRecetasAVigentes = 0;
    let totalRecetasAVencidas = 0;
    let query = {};
    try {
        const parametro: any = await RecetasParametros.findOne({ key: 'fechaLimite' });
        const days = (parametro && parametro.value) ? Number(parametro.value) : 30;
        const fechaFinVigentes = moment().startOf('day').subtract(days, 'days').toDate();
        const fechaFinPendientes = moment().add(1, 'd').endOf('day').toDate();
        const fechaInicioPendientes = moment().subtract(3, 'month').endOf('day').toDate();
        // actualizar recetas pendientes a vigentes
        query = {
            'estadoActual.tipo': 'pendiente',
            fechaRegistro: {
                $lte: fechaFinPendientes,
                $gte: fechaInicioPendientes

            }
        };
        const recetasPendientes: any = await Receta.find(query);
        for (const receta of recetasPendientes) {
            try {
                receta.estados.push({
                    tipo: 'vigente',
                    fecha: moment().toDate(),
                });
                totalRecetasAVigentes++;
                Auth.audit(receta, userScheduler as any);
                await receta.save();
            } catch (error) {
                await jobsLog.error('actualizarEstadosRecetas:pendientes', receta, error);
            }
        }

        // actualizar recetas vigentes a vencidas
        query = {
            'estadoActual.tipo': 'vigente',
            fechaRegistro: { $lt: fechaFinVigentes },
            'estadoDispensaActual.tipo': { $in: ['sin-dispensa', 'dispensa-parcial'] },
        };

        const recetasVigentes: any = await Receta.find(query);

        for (const receta of recetasVigentes) {
            try {
                receta.estados.push({
                    tipo: 'vencida',
                    fecha: moment().toDate()
                });
                Auth.audit(receta, userScheduler as any);
                await receta.save();
                totalRecetasAVencidas++;
            } catch (error) {
                await jobsLog.error('actualizarEstadosRecetas:vencidas', receta, error);
            }
        }
        await jobsLog.info('actualizarEstadosRecetas', { totalRecetasAVigentes, totalRecetasAVencidas });
    } catch (err) {
        await jobsLog.error('actualizarEstadosRecetas', { totalRecetasAVigentes, totalRecetasAVencidas, query }, err);
        return (done(err));
    }
    done();
}

