import * as moment from 'moment';
import { Types } from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import { RecetaInsumo } from './receta-insumo.schema';
import { createLog, informarLog, updateLog } from '../recetaLogs';
import { ParamsIncorrect, RecetaNotFound, RecetaNotEdit } from '../recetas.error';
import { Paciente } from '../../../core-v2/mpi/paciente/paciente.schema';
import { Profesional } from '../../../core/tm/schemas/profesional';
import { getProfesionActualizada } from '../recetasController';
import { getReceta } from '../services/receta';

export async function buscarRecetasInsumos(req) {
    const options: any = {};
    const params = req.params.id ? req.params : req.query;
    const fechaVencimiento = moment().subtract(30, 'days').startOf('day').toDate();
    const pacienteId = params.pacienteId || null;
    const documento = params.documento || null;
    const sexo = params.sexo || null;
    const user = req.user || {};
    try {
        if (!params.id && !params.idRegistro && ((!pacienteId && (!documento || !sexo)) || (pacienteId && !Types.ObjectId.isValid(pacienteId)))) {
            throw new ParamsIncorrect();
        }
        const paramMap = {
            id: '_id',
            pacienteId: 'paciente.id',
            documento: 'paciente.documento',
            sexo: 'paciente.sexo',
            tipo: 'insumo.tipo',
            idRegistro: 'idRegistro'
        };
        Object.keys(paramMap).forEach(key => {
            if (params[key]) {
                options[paramMap[key]] = key === 'id' ? Types.ObjectId(params[key]) : params[key];
            }
        });

        if (params.estadoDispensa) {
            const estadoDispensaArray = params.estadoDispensa.replace(/ /g, '').split(',');
            options['estadoDispensaActual.tipo'] = { $in: estadoDispensaArray };
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

        if (Object.keys(options).length === 0) {
            throw new ParamsIncorrect();
        }

        let recetasInsumos: any = await RecetaInsumo.find(options);

        if (user.type === 'app-token') {
            const sistema = user.app.nombre.toLowerCase();
            recetasInsumos = sistema ? await registrarAppNotificadas(req, recetasInsumos, sistema) : [];
        }

        return recetasInsumos;
    } catch (err) {
        await informarLog.error('buscarRecetasInsumos', { params, options }, err, req);
        return err;
    }
}

export async function create(req) {
    const pacienteRecetar = req.body.paciente;
    const profRecetar = req.body.profesional;
    const dataRecetaInsumo = {
        insumo: req.body.insumo,
        idPrestacion: req.body.idPrestacion,
        idRegistro: req.body.idRegistro || req.body.idPrestacion,
        fechaRegistro: null,
        fechaPrestacion: null,
        paciente: null,
        profesional: null,
        organizacion: req.body.organizacion,
        diagnostico: null,
        origenExterno: null
    };
    try {
        dataRecetaInsumo.fechaRegistro = dataRecetaInsumo.fechaRegistro ? moment(dataRecetaInsumo.fechaRegistro).toDate() : moment().toDate();
        dataRecetaInsumo.fechaPrestacion = dataRecetaInsumo.fechaPrestacion ? dataRecetaInsumo.fechaPrestacion : dataRecetaInsumo.fechaRegistro;
        const insumoIncompleto = !req.body.insumo || (!req.body.insumo.concepto?.conceptId && !req.body.insumo.generico?.id);
        dataRecetaInsumo.origenExterno = {
            id: req.body.origenExterno?.id || '',
            app: req.user.app?.nombre.toLowerCase() || '',
            fecha: req.body.origenExterno?.fecha ? new Date(req.body.origenExterno.fecha) : dataRecetaInsumo.fechaRegistro,
        };
        if (insumoIncompleto) {
            throw new ParamsIncorrect('Faltan datos del insumo');
        } else {
            const query: any = {
                idRegistro: dataRecetaInsumo.idRegistro
            };
            if (dataRecetaInsumo.insumo.generico) {
                query['insumo.insumo'] = dataRecetaInsumo.insumo.generico.insumo;
            } else {
                query['insumo.concepto.conceptId'] = dataRecetaInsumo.insumo.concepto.conceptId;
            }
            const recetaInsumo = await RecetaInsumo.findOne(query);
            if (recetaInsumo) {
                throw new ParamsIncorrect('Receta de insumo ya registrada');
            }
        }
        if (!req.body.idPrestacion || !dataRecetaInsumo.organizacion) {
            throw new ParamsIncorrect('Faltan datos de la receta de insumo');
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
            dataRecetaInsumo.paciente = pacienteAndes;
        }
        if (!profRecetar || !profRecetar.id) {
            throw new ParamsIncorrect('Faltan datos del profesional');
        } else {
            const profAndes = await Profesional.findById(profRecetar.id);
            if (!profAndes) {
                throw new ParamsIncorrect('Profesional no encontrado');
            }
            const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profRecetar.id);
            dataRecetaInsumo.profesional = {
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
        return await crearRecetaInsumo(dataRecetaInsumo, req);
    } catch (err) {
        createLog.error('create', { dataRecetaInsumo, pacienteRecetar, profRecetar }, err, req);
        return err;
    }
}

export async function crearRecetaInsumo(dataRecetaInsumo, req) {
    const insumo = dataRecetaInsumo.insumo;
    const tratamientoProlongado: Boolean = insumo.tratamientoProlongado && insumo.tiempoTratamiento && insumo.tiempoTratamiento.id !== null;
    const cantRecetas = (tratamientoProlongado) ? parseInt(insumo.tiempoTratamiento.id, 10) : 1;
    const recetas = [];
    let recetaInsumo;
    for (let i = 0; i < cantRecetas; i++) {
        try {
            recetaInsumo = new RecetaInsumo();
            recetaInsumo.idPrestacion = dataRecetaInsumo.idPrestacion;
            recetaInsumo.idRegistro = dataRecetaInsumo.idRegistro;
            const diag = insumo?.diagnostico;
            recetaInsumo.diagnostico = (typeof diag === 'string') ? { descripcion: diag } : diag;
            if (insumo.generico) {
                recetaInsumo.insumo = {
                    id: insumo.generico.id,
                    nombre: insumo.generico.nombre,
                    codigo: insumo.generico.codigo,
                    tipo: insumo.generico.tipo,
                    tratamientoProlongado,
                    tiempoTratamiento: tratamientoProlongado ? insumo.tiempoTratamiento : null,
                    ordenTratamiento: i,
                    cantidad: insumo.cantidad,
                    especificacion: insumo.especificacion
                };
            } else {
                recetaInsumo.insumo = {
                    ...insumo,
                    tratamientoProlongado,
                    tiempoTratamiento: tratamientoProlongado ? insumo.tiempoTratamiento : null,
                    ordenTratamiento: i
                };
            }
            recetaInsumo.estados = i < 1 ? [{ tipo: 'vigente' }] : [{ tipo: 'pendiente' }];
            recetaInsumo.estadosDispensa = [{ tipo: 'sin-dispensa', fecha: moment().toDate() }];
            recetaInsumo.paciente = dataRecetaInsumo.paciente;
            recetaInsumo.paciente.obraSocial = dataRecetaInsumo.paciente.obraSocial;
            recetaInsumo.paciente.id = dataRecetaInsumo.paciente.id || dataRecetaInsumo.paciente._id;
            recetaInsumo.profesional = dataRecetaInsumo.profesional;
            recetaInsumo.profesional._id = dataRecetaInsumo.profesional.id || dataRecetaInsumo.profesional._id;
            recetaInsumo.organizacion = dataRecetaInsumo.organizacion;
            recetaInsumo.fechaRegistro = moment(dataRecetaInsumo.fechaRegistro).add(i * 30, 'days').toDate();
            recetaInsumo.fechaPrestacion = moment(dataRecetaInsumo.fechaPrestacion).toDate();
            if (dataRecetaInsumo.origenExterno) {
                recetaInsumo.origenExterno = dataRecetaInsumo.origenExterno;
            }
            if (req.user) {
                Auth.audit(recetaInsumo, req as any);
            } else {
                recetaInsumo.audit(req);
            }
            await recetaInsumo.save();
            recetas.push(recetaInsumo);
        } catch (err) {
            createLog.error('crearRecetaInsumo', { dataRecetaInsumo }, err, req);
            return err;
        }
    }
    return recetas;
}

export async function buscarRecetasInsumosPorProfesional(req) {
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
            filter['estadoActual.tipo'] = { $ne: excluirEstado };
        }
        const recetasInsumos = await RecetaInsumo.find(filter);
        return recetasInsumos;
    } catch (err) {
        await informarLog.error('buscarRecetasInsumosPorProfesional', { params: req.params, query: req.query }, err);
        return err;
    }
}

export async function suspender(recetaInsumoId, req) {
    const motivo = req.body.motivo;
    const observacion = req.body.observacion;
    const profesional = req.body.profesional;
    try {
        const recetaInsumo: any = await RecetaInsumo.findById(recetaInsumoId);
        if (!recetaInsumo) {
            throw new RecetaNotFound();
        }
        const recetasASuspender = await RecetaInsumo.find({
            'insumo.concepto.conceptId': recetaInsumo.insumo.concepto.conceptId,
            idRegistro: recetaInsumo.idRegistro
        });
        const promises = recetasASuspender.map(async (receta: any) => {
            if ((receta.estadoActual.tipo === 'vigente') || (receta.estadoDispensaActual.tipo !== 'dispensa-parcial' && receta.estadoActual.tipo === 'pendiente')) {
                receta.estados.push({
                    tipo: 'suspendida',
                    motivo,
                    observacion,
                    profesional,
                    fecha: new Date()
                });
                Auth.audit(receta, req);
                await receta.save();
            }
        });
        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        await updateLog.error('suspender', { motivo, observacion, profesional, recetaInsumoId }, error);
        return error;
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

        let recetaInsumo: any = await RecetaInsumo.findById(recetaId);
        if (!recetaInsumo) {
            throw new RecetaNotFound();
        }

        recetaInsumo = await dispensar(recetaInsumo, operacion, dataDispensa, sistema);

        Auth.audit(recetaInsumo, req);
        return await recetaInsumo.save();
    } catch (error) {
        await updateLog.error('setEstadoDispensaInsumo', { operacion, sistema, recetaId, dataDispensa }, error);
        return error;
    }
}

export async function dispensar(recetaInsumo, operacion, dataDispensa, sistema) {
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
    const dispensaExistente = recetaInsumo.dispensa.find(d => d.idDispensaApp === idDispensaApp);
    if (!dispensaExistente) {
        const dispensa: any = { idDispensaApp };
        const tipo = (operacion === 'dispensar') ? 'finalizada' : recetaInsumo.estadoActual.tipo;
        const estadoReceta = { tipo };
        dispensa.fecha = dataDispensa.fecha ? moment(dataDispensa.fecha).toDate() : moment().toDate();
        let insumos = [];
        if (dataDispensa?.insumos?.length) {
            insumos = dataDispensa.insumos.map(ins => {
                const insumo: any = {};
                if (ins.insumo) {
                    insumo.insumo = ins.insumo || {};
                    insumo.descripcion = (ins.insumo.nombre || '') + (ins.cantidadEnvases || '');
                }
                insumo.unidades = ins.unidades || null;
                insumo.cantidad = ins.cantidad || null;
                insumo.cantidadEnvases = ins.cantidadEnvases || null;
                return insumo;
            });
            dispensa.insumos = insumos;
        }
        dispensa.organizacion = dataDispensa.organizacion || null;
        recetaInsumo.dispensa.push(dispensa);
        recetaInsumo.estados.push(estadoReceta);

        recetaInsumo.estadosDispensa.push({
            tipo: tipoDispensa,
            idDispensaApp,
            fecha: dispensa.fecha,
            sistema
        });
    }
    return recetaInsumo;
}

export async function actualizarAppNotificada(idReceta, sistema, req) {
    try {
        if (idReceta && Types.ObjectId.isValid(idReceta)) {
            const recetaInsumo: any = await RecetaInsumo.findById(idReceta);
            if (!recetaInsumo) {
                throw new RecetaNotFound();
            }
            const estadoActual = recetaInsumo.estadoActual.tipo;
            const estadoDispensa = recetaInsumo.estadoDispensaActual.tipo;
            if (estadoActual === 'vigente' && estadoDispensa === 'sin-dispensa') {
                const app = recetaInsumo.appNotificada.find(a => a.app === sistema);
                if (app) {
                    recetaInsumo.appNotificada = recetaInsumo.appNotificada.filter(a => a.app !== sistema);
                    Auth.audit(recetaInsumo, req);
                    await recetaInsumo.save();
                    await updateLog.info('sin-dispensar', { sistema, idReceta, recetaInsumo });
                    return recetaInsumo;
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

export async function cancelarDispensa(idReceta, dataDispensa, sistema, req) {
    try {
        const idDispensa = dataDispensa.idDispensa;
        const motivo = dataDispensa.motivo;
        const organizacion = dataDispensa.organizacion;
        const idValido = idReceta && Types.ObjectId.isValid(idReceta);
        if (idValido && idDispensa) {
            const recetaInsumo: any = await RecetaInsumo.findById(idReceta);
            if (!recetaInsumo) {
                throw new RecetaNotFound();
            }
            const estadoActual = recetaInsumo.estadoActual.tipo;
            const estadoDispensa = recetaInsumo.estadoDispensaActual.tipo;
            if (estadoDispensa !== 'sin-dispensa') {
                const tipo = (recetaInsumo.estadoActual.tipo === 'finalizada') ? await calcularEstadoReceta(recetaInsumo) : recetaInsumo.estadoActual.tipo;
                const estadoReceta = { tipo };
                recetaInsumo.estados.push(estadoReceta);

                recetaInsumo.dispensa = recetaInsumo.dispensa.filter(disp => disp.idDispensaApp !== idDispensa);
                const tipoDispensa = (recetaInsumo.dispensa.length) ? 'dispensa-parcial' : 'sin-dispensa';
                recetaInsumo.estadosDispensa.push({
                    tipo: tipoDispensa,
                    fecha: new Date(),
                    sistema,
                    cancelada: {
                        idDispensaApp: idDispensa,
                        motivo,
                        organizacion
                    }
                });

                recetaInsumo.appNotificada = recetaInsumo.appNotificada.filter(a => a.app !== sistema);
                Auth.audit(recetaInsumo, req);
                await recetaInsumo.save();
                await updateLog.info('cancelarDispensa', { sistema, idReceta, dataDispensa });
                return recetaInsumo;
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

export async function calcularEstadoReceta(recetaInsumo) {
    const today = moment();
    const fechaVencimiento = moment(recetaInsumo.fechaRegistro).add(30, 'days');
    if (today.isBefore(fechaVencimiento)) {
        return 'vigente';
    } else {
        return 'vencida';
    }
}

export async function consultarEstadoInsumo(recetaInsumo, sistema) {
    try {
        const pacienteId = recetaInsumo.paciente.id.toString();
        const recetaDisp = await getReceta(Types.ObjectId(recetaInsumo.id), Types.ObjectId(pacienteId), sistema);

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
        await informarLog.error('consultarEstadoInsumo', { recetaId: recetaInsumo.id, sistema }, error);
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
        const arrayApps = receta.appNotificada || [];
        if (arrayApps.length) {
            let indiceApp = arrayApps.findIndex(a => a.app === sistema);
            if (indiceApp !== -1) {
                arrayApps[indiceApp].fecha = moment().toDate();
            } else {
                indiceApp = arrayApps.findIndex(a => a.app !== sistema);
                const sistema2 = arrayApps[indiceApp].app;
                const resultado = await consultarEstadoInsumo(receta, sistema2);

                if (resultado.success) {
                    const { recetaDisp, tipo, dispensada } = resultado;

                    if (dispensada) {
                        recetaDisp.dispensas.forEach(async d => {
                            const dispensaInsumo = {
                                ...d.dispensa,
                                insumos: d.dispensa.insumos || d.dispensa.medicamentos
                            };
                            receta = d.estado ? await dispensar(receta, d.estado, dispensaInsumo, sistema2) : receta;
                        });
                        incluirReceta = false;
                    } else {
                        if (tipo === 'sin-dispensa') {
                            receta.appNotificada = arrayApps.filter(a => a.app !== sistema2);
                            receta.appNotificada.push(appN);
                        } else {
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
