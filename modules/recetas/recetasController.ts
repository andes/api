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

        const estadoArray = params.estado ? params.estado.split(',') : [];

        if (params.estado) {
            options['estadoActual.tipo'] = { $in: estadoArray };
        }

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

        const includeVigente = estadoArray.includes('vigente');

        if (includeVigente) {
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

/**
 * Groups recetas by idRegistro and selects the one with the smallest ordenTratamiento from each group
 * @param recetaIds Array of receta IDs
 * @returns Array of selected recetas (one per group)
 */
export async function obtenerRecetasPorGrupo(recetaIds) {
    try {
        const recetasPromises = recetaIds.map(async (recetaId) => {
            const receta: any = await Receta.findById(recetaId);
            return receta;
        });
        const recetas = await Promise.all(recetasPromises);
        const grupos = {};
        recetas.forEach(receta => {
            if (receta) {
                const idRegistro = receta.idRegistro;
                if (!grupos[idRegistro]) {
                    grupos[idRegistro] = [];
                }
                grupos[idRegistro].push(receta);
            }
        });

        const recetasASuspender = [];
        Object.values(grupos).forEach((grupo: any[]) => {
            if (grupo.length > 0) {
                const recetaMenorOrden = grupo.reduce((min, receta) =>
                    receta.medicamento.ordenTratamiento < min.medicamento.ordenTratamiento ? receta : min
                );
                recetasASuspender.push(recetaMenorOrden);
            }
        });

        return recetasASuspender;
    } catch (error) {
        await updateLog.error('obtenerRecetasPorGrupo', { recetaIds }, error);
        throw error;
    }
}

export async function suspender(recetas, req) {
    const motivo = req.body.motivo;
    const observacion = req.body.observacion;
    const profesional = req.body.profesional;
    try {
        if (!recetas) {
            throw new ParamsIncorrect();
        }
        const recetasASuspender = await obtenerRecetasPorGrupo(recetas);
        const promises = recetas.map(async (recetaId) => {

            const receta: any = await Receta.findById(recetaId);

            if (!receta) {
                throw new RecetaNotFound();
            }
            if (!receta.medicamento.tratamientoProlongado) {
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
                await Receta.deleteMany({ idRegistro, 'medicamento.concepto.conceptId': medicamento, 'estadoActual.tipo': 'pendiente', 'estadoDispensaActual.tipo': 'sin-dispensa' });
            } else {
                if (recetasASuspender.some(r => r.id.toString() === receta.id.toString())) {
                    receta.estados.push({
                        tipo: 'suspendida',
                        motivo,
                        observacion,
                        profesional,
                        fecha: new Date()
                    });
                    Auth.audit(receta, req);
                    await receta.save();
                } else {
                    const _id = receta.id;
                    const medicamento = receta.medicamento?.concepto.conceptId;
                    await Receta.deleteOne({ _id });
                }
            }
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

export async function getProfesionActualizada(idProfesional) {
    let profesionGrado = '';
    let matriculaGrado = 0;
    let especialidades = '';

    const infoMatriculas = await searchMatriculas(idProfesional);

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
        fechaRegistro: null,
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
            const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profRecetar.id);
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
    for (let i = 0;i < cantRecetas;i++) {
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

