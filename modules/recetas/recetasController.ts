import * as moment from 'moment';
import { Types } from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { userScheduler } from '../../config.private';
import { searchMatriculas } from '../../core/tm/controller/profesional';
import { RecetasParametros } from './parametros.schema';
import { MotivosReceta, Receta } from './receta-schema';
import { createLog, informarLog, updateLog, jobsLog } from './recetaLogs';
import { ParamsIncorrect, RecetaNotEdit, RecetaNotFound } from './recetas.error';
import { getReceta } from './services/receta';
import { Paciente } from '../../core-v2/mpi/paciente/paciente.schema';
import { Profesional } from '../../core/tm/schemas/profesional';

// Función para generar ID único basado en fecha
export function generarIdDesdeFecha(fecha = new Date()) {
    // genera id unico de acuerdo a una fecha
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    return String(
        fecha.getFullYear().toString() +
        pad(fecha.getMonth() + 1, 2) +
        pad(fecha.getDate(), 2) +
        pad(fecha.getHours(), 2) +
        pad(fecha.getMinutes(), 2) +
        pad(fecha.getSeconds(), 2) +
        pad(fecha.getMilliseconds(), 3) +
        pad(Math.floor(Math.random() * 999), 3)
    );
}

export async function consultarEstado(receta, sistema) {
    try {
        // Consultar estado en el sistema externo
        const pacienteId = receta.paciente.id.toString();
        const recetaDisp = await getReceta(Types.ObjectId(receta.id), Types.ObjectId(pacienteId), sistema);

        if (!recetaDisp) {
            return {
                success: false,
                recetaDisp: null
            };
        }

        const tipo = recetaDisp.tipoDispensaActual;
        const dispensada = ['dispensada', 'dispensa-parcial'].includes(tipo);

        return {
            success: true,
            recetaDisp,
            tipo,
            dispensada
        };
    } catch (error) {
        await informarLog.error('consultarEstado', { recetaId: receta.id, sistema }, error);
        return {
            success: false,
            error
        };
    }
}


async function registrarAppNotificadas(req, recetas, sistema) {
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

                // Consulta el estado de una receta en un sistema externo
                const resultado = await consultarEstado(receta, sistema2);

                if (resultado.success) {
                    const { recetaDisp, tipo, dispensada } = resultado;

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

/**
 * Se ontienen las recetas de un paciente segun filtros:
 * @param pacienteId (optativo con documento y sexo)
 * @param documento
 * @param sexo
 * @param fechaInicio (optativo) si no se envía sólo para sistemas: de dispensas es hasta 1 año atrás (desde fechaFin u hoy)
 * @param fechaFin (optativo) si no se envía sólo para sistemas de dispensas: por defecto es hoy, salvo estado "pendiente" que se limita a próximos 10 días
 * @param estado   (optativo)
 * @param estadoDispensa (optativo) por defecto 'sin-dispensa'
 * @returns
 */
export async function buscarRecetas(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;
    const fechaVencimiento = moment().subtract(30, 'days').startOf('day').toDate();
    const pacienteId = params.pacienteId || null;
    const documento = params.documento || null;
    const sexo = params.sexo || null;
    const user = req.user;
    try {
        if ((!pacienteId && (!documento || !sexo)) || (pacienteId && !Types.ObjectId.isValid(pacienteId))) {
            throw new ParamsIncorrect();
        }
        const paramMap = {
            id: '_id',
            pacienteId: 'paciente.id',
            documento: 'paciente.documento',
            sexo: 'paciente.sexo'
        };
        Object.keys(paramMap).forEach(key => {
            if (params[key]) {
                options[paramMap[key]] = key === 'id' ? Types.ObjectId(params[key]) : params[key];
            }
        });
        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }

        if (params.estadoDispensa) {
            const estadoDispensaArray = params.estadoDispensa.replace(/ /g, '').split(',');
            options['estadoDispensaActual.tipo'] = { $in: estadoDispensaArray };
        } else {
            options['estadoDispensaActual.tipo'] = 'sin-dispensa';
        }
        const estadoArray = params.estado ? params.estado.replace(/ /g, '').split(',') : [];
        const fechaFin = params.fechaFin ? moment(params.fechaFin).endOf('day').toDate() : moment().endOf('day').toDate();
        const fechaInicio = params.fechaInicio ? moment(params.fechaInicio).startOf('day').toDate() : moment(fechaFin).subtract(1, 'years').startOf('day').toDate();

        if (estadoArray.length) {
            const optPendientes = {};
            const optVigentes = {};
            const optOtros = {};
            // Para recetas pendientes sin filtro de fechas, limitar a próximos 10 días
            const includePendiente = estadoArray.includes('pendiente');
            if (includePendiente) {
                optPendientes['fechaRegistro'] = {
                    $gte: fechaInicio,
                    $lte: params.fechaFin ? fechaFin : moment().add(10, 'days').endOf('day').toDate()
                };
                optPendientes['estadoActual.tipo'] = 'pendiente';
            }
            // Para recetas vigentes sin filtro de fechas, limitar a 30 días atrás
            const includeVigente = estadoArray.includes('vigente');
            if (includeVigente) {
                const fInicio = params.fechaInicio ? fechaInicio : fechaVencimiento;
                optVigentes['fechaRegistro'] = params.fechaFin ? { $gte: fInicio, $lte: fechaFin } : { $gte: fInicio };
                optVigentes['estadoActual.tipo'] = 'vigente';
            }
            const includeOtros = estadoArray.filter(e => e !== 'pendiente' && e !== 'vigente');
            if (includeOtros.length) {
                optOtros['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
                optOtros['estadoActual.tipo'] = { $in: includeOtros };
            }
            options['$or'] = [optPendientes, optVigentes, optOtros].filter(o => o.hasOwnProperty('estadoActual.tipo'));
        } else {
            options['estadoActual.tipo'] = { $nin: ['eliminada'] };
            if (user.type === 'app-token') {
                options['fechaRegistro'] = { $gte: fechaInicio, $lte: fechaFin };
            }
        }
        let recetas: any = await Receta.find(options);
        if (!recetas.length) {
            return [];
        }

        // Generar idAndes para recetas que no lo tengan
        const recetasActualizadas = [];
        for (const receta of recetas) {
            if (!receta.idReceta) {
                receta.idReceta = generarIdDesdeFecha(receta.createdAt || new Date());
                Auth.audit(receta, req);
                await receta.save();
            }
            recetasActualizadas.push(receta);
        }
        recetas = recetasActualizadas;

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

export async function suspender(recetaId, req) {
    const motivo = req.body.motivo;
    const observacion = req.body.observacion;
    const profesional = req.body.profesional;
    try {
        const recetaR: any = await Receta.findById(recetaId);
        const recetasASuspender = await Receta.find({
            'medicamento.concepto.conceptId': recetaR.medicamento.concepto.conceptId,
            idRegistro: recetaR.idRegistro,
            'estadoActual.tipo': { $nin: ['vencida', 'finalizada'] }
        }).sort({ fechaRegistro: -1 });


        if (recetasASuspender.length) {
            const recetasSuspender = recetasASuspender.filter((r: any) => (r.estadoActual.tipo === 'vigente') || (r.estadoDispensaActual.tipo === 'dispensa-parcial' && r.estadoActual.tipo === 'pendiente'));
            const recetasEliminar = recetasASuspender.filter((r: any) => (r.estadoDispensaActual.tipo === 'sin-dispensa' && r.estadoActual.tipo === 'pendiente'));
            if (recetasSuspender.length === 0 && recetasEliminar.length !== 0) {
                // en el tratamiento prolongado, al menos una receta debe quedar en estado suspendido
                const recetaSusp = recetasEliminar.pop();
                recetasSuspender.push(recetaSusp);
            }
            const recSusp = await Promise.all(await recetasUpdate(recetasSuspender, 'suspendida', motivo, observacion, profesional, req));

            const rec = recSusp.concat(await Promise.all(await recetasUpdate(recetasEliminar, 'eliminada', motivo, observacion, profesional, req)));

            return rec;
        }
        return recetasASuspender;
    } catch (error) {
        await updateLog.error('suspender', { motivo, observacion, profesional, recetaId }, error);
        return error;
    }
}

async function recetasUpdate(recetas, estado, motivo, observacion, profesional, req) {
    return recetas.map(async (receta: any) => {
        receta.estados.push({
            tipo: estado,
            motivo,
            observacion,
            profesional,
        });
        Auth.audit(receta, req);
        return await receta.save();
    });
};

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

export async function dispensar(receta, operacion, dataDispensa, sistema) {
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

export async function getProfesionActualizada(profesional) {
    let profesionGrado = '';
    let matriculaGrado = 0;
    let especialidades = '';

    if (profesional.formacionGrado) {
        // Los codigos de los roles permitidos son los de las profesiones: Médico, Odontólogo y Obstetra respectivamente.
        const filterFormaciones = (e) => { return e.matriculacion?.length && [1, 2, 23].includes(e.profesion.codigo); };

        const formacionEncontrada = profesional.formacionGrado.find(filterFormaciones);

        profesionGrado = formacionEncontrada ? formacionEncontrada.profesion.nombre : '';
        matriculaGrado = formacionEncontrada ? formacionEncontrada.matriculacion[formacionEncontrada.matriculacion.length - 1].matriculaNumero : '';
    }
    if (profesional.formacionPosgrado) {
        const especialidadesTxt = profesional.formacionPosgrado.length ? profesional.formacionPosgrado.map(postgrado => postgrado.matriculacion ? `${postgrado.especialidad?.nombre} 
                                                                                   (Mat. ${postgrado.matriculacion[postgrado.matriculacion.length - 1].matriculaNumero})` : '') : [];
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


export async function create(req) {
    const pacienteRecetar = req.body.paciente;
    const profRecetar = req.body.profesional;
    const dataReceta = {
        medicamento: req.body.medicamento,
        idPrestacion: req.body.idPrestacion,
        idRegistro: req.body.idRegistro || req.body.idPrestacion,
        fechaRegistro: req.body.fechaRegistro,
        fechaPrestacion: null,
        paciente: null,
        profesional: null,
        organizacion: req.body.organizacion,
        diagnostoco: null,
        origenExterno: null

    };
    try {
        dataReceta.fechaRegistro = dataReceta.fechaRegistro ? moment(dataReceta.fechaRegistro).toDate() : moment().toDate();
        dataReceta.fechaPrestacion = dataReceta.fechaPrestacion ? dataReceta.fechaPrestacion : dataReceta.fechaRegistro;
        const medicamentoIncompleto = !req.body.medicamento || !req.body.medicamento.concepto?.conceptId || !req.body.medicamento.cantidad || !req.body.medicamento.cantEnvases;
        dataReceta.origenExterno = {
            id: req.body.origenExterno.id || '',
            app: req.user.app?.nombre.toLowerCase() || '',
            fecha: req.body.origenExterno.fecha ? new Date(req.body.origenExterno.fecha) : dataReceta.fechaRegistro,
        };
        if (medicamentoIncompleto) {
            throw new ParamsIncorrect('Faltan datos del medicamento');
        } else {
            const receta = await Receta.findOne({
                'medicamento.concepto.conceptId': dataReceta.medicamento.concepto.conceptId,
                idRegistro: dataReceta.idRegistro
            });
            if (receta) {
                throw new ParamsIncorrect('Receta ya registrada');
            }
        }
        if (!req.body.idPrestacion || !dataReceta.organizacion) {
            throw new ParamsIncorrect('Faltan datos de la receta');
        }
        if (!pacienteRecetar || !pacienteRecetar.id) {
            throw new ParamsIncorrect('Faltan datos del paciente');
        } else {
            const pacienteAndes: any = await Paciente.findById(pacienteRecetar.id);
            if (!pacienteAndes) {
                throw new ParamsIncorrect('Paciente no encontrado');
            } else {
                pacienteAndes.obraSocial = (!pacienteRecetar.obraSocial) ? null :
                    {
                        origen: pacienteRecetar.obraSocial.otraOS ? 'RECETAR' : 'PUCO',
                        nombre: pacienteRecetar.obraSocial.nombre,
                        financiador: pacienteRecetar.obraSocial.nombre,
                        codigoPuco: pacienteRecetar.obraSocial.codigoPuco || null,
                        numeroAfiliado: pacienteRecetar.obraSocial.numeroAfiliado || null
                    };
            }
            dataReceta.paciente = pacienteAndes;
        }
        if (!profRecetar || !profRecetar.id) {
            throw new ParamsIncorrect('Faltan datos del profesional');
        } else {
            const profAndes = await Profesional.findById(profRecetar.id);
            if (!profAndes) {
                throw new ParamsIncorrect('Profesional no encontrado');
            }
            const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profAndes);
            dataReceta.profesional = {
                _id: profAndes._id,
                id: profAndes._id,
                nombre: profAndes.nombre,
                apellido: profAndes.apellido,
                documento: profAndes.documento,
                profesion: profesionGrado,
                especialidad: especialidades,
                matricula: matriculaGrado
            };
        }
        return await crearReceta(dataReceta, req);
    } catch (err) {
        createLog.error('create', { dataReceta, pacienteRecetar, profRecetar }, err, req);
        return err;
    }
}


export async function crearReceta(dataReceta, req) {
    const medicamento = dataReceta.medicamento;
    const tratamientoProlongado: Boolean = medicamento.tratamientoProlongado && medicamento.tiempoTratamiento && medicamento.tiempoTratamiento.id !== null;
    const cantRecetas = (tratamientoProlongado) ? parseInt(medicamento.tiempoTratamiento.id, 10) : 1;
    const recetas = [];
    let receta;
    for (let i = 0; i < cantRecetas; i++) {
        try {
            receta = new Receta();
            receta.idPrestacion = dataReceta.idPrestacion;
            receta.idRegistro = dataReceta.idRegistro;
            const diag = medicamento.diagnostico;
            receta.diagnostico = (typeof diag === 'string') ? { descripcion: diag } : diag;
            receta.medicamento = {
                concepto: medicamento.concepto || medicamento.generico,
                presentacion: medicamento.presentacion?.term || medicamento.presentacion,
                unidades: medicamento.unidades,
                cantidad: medicamento.cantidad,
                cantEnvases: medicamento.cantEnvases,
                dosisDiaria: {
                    dosis: medicamento.dosisDiaria.dosis,
                    intervalo: medicamento.dosisDiaria.intervalo,
                    dias: medicamento.dosisDiaria.dias,
                    notaMedica: medicamento.dosisDiaria.notaMedica
                },
                tratamientoProlongado,
                tiempoTratamiento: tratamientoProlongado ? medicamento.tiempoTratamiento : null,
                ordenTratamiento: i,
                tipoReceta: medicamento.tipoReceta?.id || medicamento.tipoReceta || 'simple',
                serie: medicamento.serie,
                numero: medicamento.numero,
            };
            receta.estados = i < 1 ? [{ tipo: 'vigente' }] : [{ tipo: 'pendiente' }];
            receta.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
            receta.paciente = dataReceta.paciente;
            receta.paciente.obraSocial = dataReceta.paciente.obraSocial;
            receta.paciente.id = dataReceta.paciente.id || dataReceta.paciente._id;
            receta.profesional = dataReceta.profesional;
            receta.profesional._id = dataReceta.profesional.id || dataReceta.profesional._id; // revisar como se generan ids en ambos casos
            receta.organizacion = dataReceta.organizacion;
            receta.fechaRegistro = moment(dataReceta.fechaRegistro).add(i * 30, 'days').toDate();
            receta.fechaPrestacion = moment(dataReceta.fechaPrestacion).toDate();
            if (dataReceta.origenExterno) {
                receta.origenExterno = dataReceta.origenExterno;
            }
            if (req.user) {
                Auth.audit(receta, req as any);
            } else {
                receta.audit(req);
            }
            await receta.save();
            recetas.push(receta);
        } catch (err) {
            createLog.error('crearReceta', { dataReceta, receta }, err, req);
            return err;
        }

    }
    return recetas;
}
export async function buscarRecetasPorProfesional(req) {
    try {
        const profesionalId = req.params.id;
        const { estadoReceta, desde, hasta, origenExternoApp, excluirEstado } = req.query;
        if (!profesionalId || !Types.ObjectId.isValid(profesionalId)) {
            throw new ParamsIncorrect();
        }
        const filter: any = {
            'profesional.id': Types.ObjectId(profesionalId)
        };
        if (estadoReceta) {
            filter['estadoActual.tipo'] = estadoReceta;
        }
        if (desde || hasta) {
            filter['fechaRegistro'] = {};
            if (desde) {
                filter['fechaRegistro'].$gte = moment(desde).startOf('day').toDate();
            }
            if (hasta) {
                filter['fechaRegistro'].$lte = moment(hasta).endOf('day').toDate();
            }
        }
        if (origenExternoApp) {
            filter['origenExterno.app'] = origenExternoApp;
        }
        if (excluirEstado) {
            filter['estadoActual.tipo'] = { $nin: excluirEstado };
        }
        const recetas = await Receta.find(filter);
        return recetas;
    } catch (err) {
        await informarLog.error('buscarRecetasPorProfesional', { params: req.params, query: req.query }, err);
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
                    tipo: 'vigente'
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
                    tipo: 'vencida'
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

export async function actualizarEstadosDispensa() {
    try {
        // Buscar recetas con appNotificada y sin dispensa
        const recetas: any = await Receta.find({
            appNotificada: { $exists: true },
            'estadoDispensaActual.tipo': 'sin-dispensa',
            'estadoActual.tipo': 'vigente'
        });


        if (!recetas || recetas.length === 0) {
            await informarLog.error('actualizarEstadosDispensa', {}, { message: 'No hay recetas para actualizar' });
        }

        const resultados = {
            total: recetas.length,
            dispensadas: 0,
            sinDispensa: 0,
            errores: 0,
            errorConsultandoEstado: 0
        };

        // Procesar cada receta
        for (const receta of recetas) {
            try {
                // Verificar cada app notificada
                for (const app of receta.appNotificada) {
                    const sistema = app.app;

                    // Consulta el estado de una receta en un sistema externo
                    const resultado = await consultarEstado(receta, sistema);

                    if (resultado.success) {
                        const { recetaDisp, tipo, dispensada } = resultado;

                        // Si la receta fue dispensada, actualizar estado
                        if (dispensada) {
                            recetaDisp.dispensas.forEach(async d => {
                                if (d.estado) {
                                    // Actualizar estado de dispensa
                                    await dispensar(receta, d.estado, d.dispensa, sistema);
                                    await receta.save();

                                    resultados.dispensadas++;
                                }
                            });
                        } else if (tipo === 'sin-dispensa') {
                            // Si no fue dispensada, eliminar del array appNotificada
                            const req = { user: { usuario: { nombre: 'JOB_ACTUALIZACION' } } };
                            await actualizarAppNotificada(receta.id, sistema, req);

                            resultados.sinDispensa++;
                        }
                    } else {
                        resultados.errorConsultandoEstado++;
                    }
                }
            } catch (error) {
                resultados.errores++;
                await informarLog.error('actualizarEstadosDispensa', { recetaId: receta.id }, error);
            }
        }

        await updateLog.info('actualizarEstadosDispensa', { resultados });
    } catch (error) {
        await informarLog.error('actualizarEstadosDispensa', {}, error);
    }
}

async function fetchRecetasExpandidas(recetasOriginales: any[]) {
    const recetasExpandidas: any[] = [];
    const procesadosIdRegistro = new Set();

    for (const recetaOriginal of recetasOriginales) {
        const esProlongado = recetaOriginal.medicamento?.tratamientoProlongado && recetaOriginal.idRegistro != null;
        if (esProlongado) {
            if (!procesadosIdRegistro.has(recetaOriginal.idRegistro)) {
                procesadosIdRegistro.add(recetaOriginal.idRegistro);

                const prolongadas = await Receta.find({
                    idRegistro: recetaOriginal.idRegistro,
                    'medicamento.concepto.conceptId': recetaOriginal.medicamento.concepto.conceptId
                }).sort({ 'medicamento.ordenTratamiento': 1 });

                for (const r of prolongadas) {
                    if (!recetasExpandidas.find(e => e._id.toString() === r._id.toString())) {
                        recetasExpandidas.push(r);
                    }
                }
            }
        } else {
            if (!recetasExpandidas.find(e => e._id.toString() === recetaOriginal._id.toString())) {
                recetasExpandidas.push(recetaOriginal);
            }
        }
    }
    return recetasExpandidas;
}

async function validarRenovacion(recetaOriginal: any) {
    const estadoActual = recetaOriginal.estadoActual?.tipo;

    // Solo se puede renovar si está finalizada o vencida
    if (!['finalizada', 'vencida'].includes(estadoActual)) {
        throw new RecetaNotEdit(
            `La receta ${recetaOriginal._id} está en estado "${estadoActual}" y no puede renovarse. Solo se permiten estados: finalizada, vencida`
        );
    }

    // No se puede renovar si fue suspendida en algún momento
    const estuveSuspendida = recetaOriginal.estados?.some((e: any) => e.tipo === 'suspendida');
    if (estuveSuspendida) {
        throw new RecetaNotEdit(`La receta ${recetaOriginal._id} fue suspendida y no puede renovarse`);
    }

    // No se puede renovar si hay recetas pendientes del mismo tratamiento prolongado
    if (recetaOriginal.idRegistro) {
        const pendiente = await Receta.findOne({
            idRegistro: recetaOriginal.idRegistro,
            'estadoActual.tipo': 'pendiente'
        });
        if (pendiente) {
            throw new RecetaNotEdit(
                `La receta ${recetaOriginal._id} tiene recetas pendientes del tratamiento prolongado y no puede renovarse`
            );
        }
    }

    // Validar antigüedad ≤ 1 año
    const fechaLimiteRenovacion = moment().subtract(1, 'year').toDate();
    if (recetaOriginal.fechaRegistro < fechaLimiteRenovacion) {
        throw new RecetaNotEdit(
            `La receta ${recetaOriginal._id} tiene más de 1 año de antigüedad y no puede renovarse`
        );
    }
}

async function aplicarRenovacion(recetaOriginal: any, profesionalData: any, organizacion: any, ahora: Date, req: any) {
    const medicamento = recetaOriginal.medicamento;
    const esProlongado = medicamento?.tratamientoProlongado && medicamento?.tiempoTratamiento?.id != null;
    const ordenTratamiento = medicamento?.ordenTratamiento || 0;

    recetaOriginal.profesional = profesionalData as any;
    recetaOriginal.organizacion = {
        id: Types.ObjectId(organizacion.id),
        nombre: organizacion.nombre
    } as any;

    // Reajusta las fechas considerando si es mes 0, mes 1, mes 2, etc, en base al orden para prolongados
    recetaOriginal.fechaRegistro = moment(ahora).add(ordenTratamiento * 30, 'days').toDate();

    // Limpia origenExterno por si la receta original venía de otro lado
    recetaOriginal.origenExterno = undefined as any;

    // Avanzar el estado a vigente (la inicial o simple) o pendiente (las subsiguientes)
    const nuevoEstado = ordenTratamiento < 1 ? 'vigente' : 'pendiente';
    recetaOriginal.estados.push({ tipo: nuevoEstado } as any);
    recetaOriginal.estadosDispensa.push({ tipo: 'sin-dispensa', fecha: ahora } as any);

    // Limpiar historial previo de dispensas y notificaciones para arrancar un ciclo limpio
    recetaOriginal.dispensa = [];
    recetaOriginal.appNotificada = [];

    // Calcular número de renovación
    const MAX_RENOVACIONES = 12;
    let numRenovacion: number;

    if (recetaOriginal.numeroRenovacion != null) {
        // Es una renovación de una receta que ya fue renovada previamente
        if (esProlongado) {
            const cantMeses = parseInt(medicamento.tiempoTratamiento.id, 10);
            numRenovacion = recetaOriginal.numeroRenovacion + cantMeses;
        } else {
            numRenovacion = recetaOriginal.numeroRenovacion + 1;
        }
    } else {
        // Primera renovación
        if (esProlongado) {
            const cantMeses = parseInt(medicamento.tiempoTratamiento.id, 10);
            numRenovacion = cantMeses + 1 + ordenTratamiento;
        } else {
            numRenovacion = 1;
        }
    }

    if (numRenovacion > MAX_RENOVACIONES) {
        throw new RecetaNotEdit(
            `La receta ${recetaOriginal._id} ya alcanzó el máximo de ${MAX_RENOVACIONES} renovaciones`
        );
    }

    // Mantenemos idRecetaOriginal si ya lo tenía, si no, se lo asignamos a sí mismo
    if (!recetaOriginal.idRecetaOriginal) {
        recetaOriginal.idRecetaOriginal = recetaOriginal._id.toString();
    }
    recetaOriginal.numeroRenovacion = numRenovacion;

    Auth.audit(recetaOriginal as any, req);
    await recetaOriginal.save();

    return recetaOriginal;
}

/**
 * Renueva un conjunto de recetas finalizadas o vencidas.
 * Se clonan los datos originales sobreescribiendo autor y efector con los valores del body.
 * Las nuevas recetas quedan en estado vigente/pendiente con dispensa sin-dispensa.
 */
export async function renovarRecetas(req) {
    const { recetasIds, profesional: profBody, organizacion } = req.body;

    try {
        // Validar parámetros básicos
        if (!recetasIds || !Array.isArray(recetasIds) || recetasIds.length === 0) {
            throw new ParamsIncorrect('Se requiere al menos un ID de receta en recetasIds');
        }
        if (!profBody || !profBody.id) {
            throw new ParamsIncorrect('Se requiere el objeto profesional con id');
        }
        if (!organizacion || !organizacion.id) {
            throw new ParamsIncorrect('Se requiere el objeto organizacion con id');
        }

        // Validar que todos los IDs sean ObjectId válidos
        const idsInvalidos = recetasIds.filter(id => !Types.ObjectId.isValid(id));
        if (idsInvalidos.length > 0) {
            throw new ParamsIncorrect(`IDs de receta inválidos: ${idsInvalidos.join(', ')}`);
        }

        // Buscar recetas originales inicialmente por IDs enviados
        const recetasOriginales: any[] = await Receta.find({
            _id: { $in: recetasIds.map(id => Types.ObjectId(id)) }
        });

        if (recetasOriginales.length !== recetasIds.length) {
            const encontrados = recetasOriginales.map(r => r._id.toString());
            const faltantes = recetasIds.filter(id => !encontrados.includes(id));
            throw new RecetaNotFound(`Recetas no encontradas: ${faltantes.join(', ')}`);
        }

        // Expandir y agrupar automáticamente todas las recetas asociadas al mismo tratamiento prolongado
        const recetasExpandidas: any[] = await fetchRecetasExpandidas(recetasOriginales);

        // Obtener el profesional desde DB para tener matrícula y datos actualizados
        const profAndes: any = await Profesional.findById(profBody.id);
        if (!profAndes) {
            throw new ParamsIncorrect('Profesional no encontrado en la base de datos');
        }
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profAndes);
        const profesionalData = {
            _id: profAndes._id,
            id: profAndes._id,
            nombre: profAndes.nombre,
            apellido: profAndes.apellido,
            documento: profAndes.documento,
            profesion: profesionGrado,
            especialidad: especialidades,
            matricula: matriculaGrado
        };

        // Validar primero todas las recetas antes de aplicar cambios
        for (const recetaOriginal of recetasExpandidas) {
            await validarRenovacion(recetaOriginal);
        }

        // Aplicar renovación y guardar
        const nuevasRecetas = [];
        const ahora = new Date();
        for (const recetaOriginal of recetasExpandidas) {
            const recetaRenovada = await aplicarRenovacion(recetaOriginal, profesionalData, organizacion, ahora, req);
            nuevasRecetas.push(recetaRenovada);
        }

        return nuevasRecetas;

    } catch (err) {
        createLog.error('renovarRecetas', { recetasIds, profBody, organizacion }, err, req);
        return err;
    }
}
