import * as moment from 'moment';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { Profesional } from '../core/tm/schemas/profesional';
import { Receta } from '../modules/recetas/receta-schema';
import { RecetaInsumo } from '../modules/recetas/recetasInsumos/receta-insumo.schema';
import { RecetaControl } from '../modules/recetas/receta-control-schema';
import { crearReceta, getProfesionActualizada } from '../modules/recetas/recetasController';
import { crearRecetaInsumo } from '../modules/recetas/recetasInsumos/recetaInsumosController';
import { generarCUIL } from '../core-v2/mpi/validacion/validacion.controller';
import { jobsLog as logger } from '../modules/recetas/recetaLogs';
import { userScheduler } from '../config.private';
import { Auth } from '../auth/auth.class';

/**
 * Job: generarRecetasFaltantes (Autosaneamiento de Recetas)
 *
 * Recorre la colección `recetaControl` buscando registros no completos
 * (estados 'pendiente' o 'incompleto') que tengan menos de 3 intentos,
 * reconstruye el contexto desde la Prestación RUP y genera las recetas faltantes
 * (tanto para tratamientos prolongados como simples, medicamentos e insumos).
 *
 * En producción se ejecuta aproximadamente cada 10 minutos.
 *
 * Parametrización opcional por CLI:
 *   --desde   YYYY-MM-DD[THH:mm]   (opcional)
 *   --hasta   YYYY-MM-DD[THH:mm]   (opcional, default: ahora - 5 min)
 *   --horas   N                    (opcional, default: sin límite, recorre todo)
 *   <minutos> N                    (opcional posicional o --minutos, default: 5 min)
 */

interface ParamsJob {
    desde?: string;
    hasta?: string;
    horas?: number;
    minutosHasta?: number;
}

function resolverRangoFechas(params: ParamsJob) {
    // Por defecto se resta 5 minutos al hasta para evitar procesar registros que se estén validando en el instante actual
    // Si se pasa minutosHasta (ej: node jobs/manual.js jobs/jobRecetaControl.js 3), se restan esos minutos
    const minutosHasta = (params.minutosHasta !== undefined && !isNaN(params.minutosHasta) && params.minutosHasta >= 0)
        ? params.minutosHasta
        : 5;

    const hasta = params.hasta ? moment(params.hasta).toDate() : moment().subtract(minutosHasta, 'minutes').toDate();

    let desde: Date | null = null;
    if (params.desde) {
        desde = moment(params.desde).toDate();
    } else if (params.horas && Number(params.horas) > 0) {
        desde = moment(hasta).subtract(Number(params.horas), 'hours').toDate();
    }
    // Si no se especifica desde ni horas, queda null (recorre todo hasta la fecha fin)

    return { desde, hasta };
}

/**
 * Reconstruye el contexto común: prestación, registro RUP y organización.
 */
async function reconstruirContexto(control: any) {
    const prestacion: any = await Prestacion.findById(control.idPrestacion);
    if (!prestacion) {
        throw new Error(`No se encontró la prestación ${control.idPrestacion}`);
    }

    const registros = prestacion.getRegistros ? prestacion.getRegistros() : (prestacion.ejecucion?.registros || []);
    const registro = (registros || []).find((r: any) => String(r._id) === String(control.idRegistro))
        || (prestacion.evolucion || []).find((r: any) => String(r._id) === String(control.idRegistro))
        || (prestacion.solicitud?.registros || []).find((r: any) => String(r._id) === String(control.idRegistro));

    if (!registro) {
        throw new Error(`No se encontró el registro ${control.idRegistro} en la prestación ${control.idPrestacion}`);
    }

    const organizacion = {
        id: prestacion.ejecucion?.organizacion?.id,
        nombre: prestacion.ejecucion?.organizacion?.nombre
    };

    return { prestacion, registro, organizacion };
}

/** Resuelve profesional para medicamento/magistral */
async function resolverProfesionalReceta(prestacion: any) {
    const documentoProfesional = prestacion.estadoActual?.createdBy?.documento
        ? prestacion.estadoActual.createdBy.documento
        : prestacion.solicitud?.profesional?.documento;

    if (!documentoProfesional) {
        throw new Error('No se pudo identificar el documento del profesional en la prestación');
    }

    const profPrestacion = await Profesional.findOne({ documento: documentoProfesional });
    if (!profPrestacion) {
        throw new Error(`No se encontró el profesional con documento ${documentoProfesional}`);
    }

    const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion);

    return {
        id: profPrestacion.id,
        nombre: profPrestacion.nombre,
        apellido: profPrestacion.apellido,
        documento: profPrestacion.documento,
        profesion: profesionGrado,
        especialidad: especialidades,
        matricula: matriculaGrado
    };
}

/** Resuelve profesional para insumo */
async function resolverProfesionalInsumo(prestacion: any) {
    const profPrestacion = prestacion.solicitud?.profesional;
    if (profPrestacion) {
        const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion);
        return {
            id: profPrestacion.id,
            nombre: profPrestacion.nombre,
            apellido: profPrestacion.apellido,
            documento: profPrestacion.documento,
            profesion: profesionGrado,
            especialidad: especialidades,
            matricula: matriculaGrado
        };
    }
    return resolverProfesionalReceta(prestacion);
}

/** Procesa control de medicamentos / magistrales */
async function procesarMedicamento(control: any) {
    const { prestacion, registro, organizacion } = await reconstruirContexto(control);
    const profesional = await resolverProfesionalReceta(prestacion);

    const pacienteCUIL = prestacion.paciente.cuil || generarCUIL(prestacion.paciente.documento, prestacion.paciente.sexo);
    const pacienteObj = (typeof prestacion.paciente.toObject === 'function') ? prestacion.paciente.toObject() : prestacion.paciente;
    const paciente = { ...pacienteObj, id: pacienteObj.id || pacienteObj._id || prestacion.paciente.id || prestacion.paciente._id, cuil: pacienteCUIL };

    const dataRecetaBase = {
        idPrestacion: prestacion.id,
        idRegistro: control.idRegistro,
        fechaRegistro: prestacion.ejecucion?.fecha || moment().toDate(),
        fechaPrestacion: prestacion.ejecucion?.fecha,
        paciente,
        profesional,
        organizacion,
        medicamento: null,
        diagnostico: null,
    };

    const medicamentos = registro.valor?.medicamentos || [];
    const esMagistral = control.tipo === 'magistral';
    const conceptIdControl = control.identificador?.conceptId;
    const codigosControl = (control.identificador?.codigo || []).map((c: any) => c.valor);

    // Buscamos el medicamento correspondiente a este control
    const medicamento = medicamentos.find((m: any) => {
        if (esMagistral) {
            const codigosM = (m.magistral?.codigo || m.concepto?.codigo || []).map((c: any) => c.valor);
            const matchCodigo = codigosM.some((c: string) => codigosControl.includes(c));
            return m.esMagistral && (
                matchCodigo ||
                (conceptIdControl && (m.concepto?.conceptId === conceptIdControl || String(m.concepto?._id) === conceptIdControl)) ||
                m.magistral?.nombre === control.nombre ||
                m.concepto?.nombre === control.nombre
            );
        }
        const cId = m.concepto?.conceptId || m.generico?.conceptId;
        return (conceptIdControl && cId === conceptIdControl)
            || m.concepto?.term === control.nombre
            || m.generico?.term === control.nombre;
    }) || medicamentos[0]; // fallback al primero si no hubo match estricto

    if (!medicamento) {
        throw new Error(`No se encontró el medicamento en el registro ${control.idRegistro}`);
    }

    const dataReceta = {
        ...dataRecetaBase,
        medicamento,
        diagnostico: medicamento?.diagnostico || null,
    };

    // Crear las recetas faltantes de forma idempotente
    const respCrear: any = await crearReceta(dataReceta, userScheduler);
    if (respCrear instanceof Error || (respCrear && !Array.isArray(respCrear) && (respCrear.message || respCrear.errors || respCrear.status))) {
        throw (respCrear instanceof Error ? respCrear : new Error(respCrear.message || JSON.stringify(respCrear)));
    }

    // Recuperamos todas las recetas en DB para sincronizar control.recetas
    const queryRecetasDb: any = {
        idPrestacion: prestacion.id,
        idRegistro: control.idRegistro
    };
    if (esMagistral) {
        queryRecetasDb['medicamento.magistral.nombre'] = medicamento.magistral?.nombre || control.nombre;
    } else if (medicamento.concepto?.conceptId || medicamento.generico?.conceptId) {
        queryRecetasDb['medicamento.concepto.conceptId'] = medicamento.concepto?.conceptId || medicamento.generico?.conceptId;
    }

    const recetasEnDb = await Receta.find(queryRecetasDb);

    if (!Array.isArray(control.recetas)) {
        control.recetas = [];
    }

    for (const r of recetasEnDb) {
        const orden = r.medicamento?.ordenTratamiento ?? 0;
        const indexExistente = control.recetas.findIndex((item: any) => {
            const id = item.receta_id || item.idReceta;
            return (id && (String(id) === String(r._id) || String(id) === String(r.idReceta))) || item.ordenTratamiento === orden;
        });
        const esRecetar = Boolean(r.origenExterno?.id || r.origenExterno?.app === 'recetar');
        const origenReceta = esRecetar ? 'recetar' : 'andes';
        const itemReceta = {
            receta_id: r._id || r.id,
            ordenTratamiento: orden,
            origen: (indexExistente >= 0 && control.recetas[indexExistente].origen === 'recetar') ? 'recetar' : origenReceta,
            fecha: r.createdAt || new Date()
        };
        if (indexExistente >= 0) {
            control.recetas[indexExistente] = { ...control.recetas[indexExistente], ...itemReceta };
        } else {
            control.recetas.push(itemReceta);
        }
    }
}

/** Procesa control de insumos (dispositivo, nutrición, etc.) */
async function procesarInsumo(control: any) {
    const { prestacion, registro, organizacion } = await reconstruirContexto(control);
    const profesional = await resolverProfesionalInsumo(prestacion);

    const pacienteObj = (typeof prestacion.paciente.toObject === 'function') ? prestacion.paciente.toObject() : prestacion.paciente;
    const paciente = { ...pacienteObj, id: pacienteObj.id || pacienteObj._id || prestacion.paciente.id || prestacion.paciente._id };

    const dataRecetaBase = {
        idPrestacion: prestacion.id,
        idRegistro: control.idRegistro,
        fechaRegistro: prestacion.ejecucion?.fecha || moment().toDate(),
        fechaPrestacion: prestacion.ejecucion?.fecha,
        paciente,
        profesional,
        organizacion,
        insumo: null,
        diagnostico: null,
    };

    const insumos = registro.valor?.insumos || [];
    const codigosControl = (control.identificador?.codigo || []).map((c: any) => c.valor);
    const conceptIdControl = control.identificador?.conceptId;

    const insumo = insumos.find((ins: any) => {
        const codigosIns = (ins.generico?.codigo || ins.codigo || []).map((c: any) => c.valor);
        const matchCodigo = codigosIns.some((c: string) => codigosControl.includes(c));
        const insId = ins.generico?.id || ins.id;
        return matchCodigo
            || (conceptIdControl && (insId === conceptIdControl || ins.generico?.conceptId === conceptIdControl))
            || ins.generico?.nombre === control.nombre
            || ins.nombre === control.nombre;
    }) || insumos[0];

    if (!insumo) {
        throw new Error(`No se encontró el insumo en el registro ${control.idRegistro}`);
    }

    const dataRecetaInsumo = {
        ...dataRecetaBase,
        insumo
    };

    const respInsumo: any = await crearRecetaInsumo(dataRecetaInsumo, { user: userScheduler });
    if (respInsumo instanceof Error || (respInsumo && !Array.isArray(respInsumo) && (respInsumo.message || respInsumo.errors || respInsumo.status))) {
        throw (respInsumo instanceof Error ? respInsumo : new Error(respInsumo.message || JSON.stringify(respInsumo)));
    }

    const insumoId = insumo.generico?.id || insumo.id;
    const queryInsumosDb: any = {
        idPrestacion: prestacion.id,
        idRegistro: control.idRegistro
    };
    if (insumoId) {
        queryInsumosDb['insumo.id'] = insumoId;
    }

    const recetasEnDb = await RecetaInsumo.find(queryInsumosDb);

    if (!Array.isArray(control.recetas)) {
        control.recetas = [];
    }

    for (const r of recetasEnDb) {
        const orden = r.insumo?.ordenTratamiento ?? 0;
        const indexExistente = control.recetas.findIndex((item: any) => {
            const id = item.receta_id || item.idReceta;
            return (id && (String(id) === String(r._id) || String(id) === String(r.idReceta))) || item.ordenTratamiento === orden;
        });
        const esRecetar = Boolean(r.origenExterno?.id || r.origenExterno?.app === 'recetar');
        const origenReceta = esRecetar ? 'recetar' : 'andes';
        const itemReceta = {
            receta_id: r._id || r.id,
            ordenTratamiento: orden,
            origen: (indexExistente >= 0 && control.recetas[indexExistente].origen === 'recetar') ? 'recetar' : origenReceta,
            fecha: r.createdAt || new Date()
        };
        if (indexExistente >= 0) {
            control.recetas[indexExistente] = { ...control.recetas[indexExistente], ...itemReceta };
        } else {
            control.recetas.push(itemReceta);
        }
    }
}

async function procesarControl(control: any) {
    switch (control.tipo) {
        case 'medicamento':
            return procesarMedicamento(control);
        case 'magistral':
            // Puede provenir de medicamentos o de insumos
            return procesarMedicamento(control);
        case 'dispositivo':
        case 'nutricion':
        case 'insumos':
            return procesarInsumo(control);
        default:
            throw new Error(`Tipo de control '${control.tipo}' no reconocido`);
    }
}

async function generarRecetasFaltantes(params: ParamsJob | any, done?: any) {
    let callback = done;
    let actualParams = params;

    if (typeof params === 'function') {
        callback = params;
        actualParams = {};
    }

    if (!actualParams || Object.keys(actualParams).length === 0) {
        actualParams = {};
        process.argv.forEach((val, idx) => {
            if (val.startsWith('--desde=')) {
                actualParams.desde = val.split('=')[1];
            } else if (val === '--desde') {
                const nextVal = process.argv[idx + 1];
                if (nextVal && !nextVal.startsWith('--')) {
                    actualParams.desde = nextVal;
                }
            }
            if (val.startsWith('--hasta=')) {
                actualParams.hasta = val.split('=')[1];
            } else if (val === '--hasta') {
                const nextVal = process.argv[idx + 1];
                if (nextVal && !nextVal.startsWith('--')) {
                    actualParams.hasta = nextVal;
                }
            }
            if (val.startsWith('--horas=')) {
                actualParams.horas = parseInt(val.split('=')[1], 10);
            } else if (val === '--horas') {
                const nextVal = process.argv[idx + 1];
                if (nextVal && !nextVal.startsWith('--')) {
                    actualParams.horas = parseInt(nextVal, 10);
                }
            }
            if (val.startsWith('--minutos=')) {
                actualParams.minutosHasta = parseInt(val.split('=')[1], 10);
            } else if (val === '--minutos') {
                const nextVal = process.argv[idx + 1];
                if (nextVal && !nextVal.startsWith('--')) {
                    actualParams.minutosHasta = parseInt(nextVal, 10);
                }
            } else if (idx >= 3 && /^\d+$/.test(val)) {
                const prevVal = process.argv[idx - 1];
                if (prevVal !== '--horas' && prevVal !== '--minutos' && prevVal !== '--desde' && prevVal !== '--hasta') {
                    // Argumento posicional numérico (ej: node jobs/manual.js jobs/jobRecetaControl.js 3)
                    actualParams.minutosHasta = parseInt(val, 10);
                }
            }
        });
    }

    const { desde, hasta } = resolverRangoFechas(actualParams);

    const resultados = {
        total: 0,
        completas: 0,
        incompletas: 0,
        errores: 0,
        porTipo: { medicamento: 0, magistral: 0, dispositivo: 0, nutricion: 0, insumos: 0 }
    };

    try {
        // Se procesan estados 'pendiente' e 'incompleto'. No se filtra por intentos en la query.
        const query: any = {
            estado: { $in: ['pendiente', 'incompleto'] },
            createdAt: { $lte: hasta }
        };
        if (desde) {
            query.createdAt.$gte = desde;
        }

        const cursor = RecetaControl.find(query).cursor({ batchSize: 50 });

        await cursor.eachAsync(async (control: any) => {
            resultados.total++;
            control.intento = (control.intento || 0) + 1;
            control.fechaUltimoIntento = new Date();

            try {
                await procesarControl(control);

                if (control.recetas.length >= control.cantTotalRecetas) {
                    control.estado = 'completo';
                    control.ultimoError = null;
                    control.markModified('ultimoError');
                    resultados.completas++;
                } else {
                    if (control.intento >= 3) {
                        control.estado = 'error';
                    } else {
                        control.estado = 'incompleto';
                    }
                    if (!control.ultimoError) {
                        control.ultimoError = {
                            message: `No se generaron todas las recetas (${control.recetas.length}/${control.cantTotalRecetas})`,
                            fecha: new Date()
                        };
                    }
                    control.markModified('ultimoError');
                    resultados.incompletas++;
                }

                if (control.tipo && resultados.porTipo[control.tipo] !== undefined) {
                    resultados.porTipo[control.tipo]++;
                }
            } catch (error: any) {
                resultados.errores++;
                if (control.intento >= 3) {
                    control.estado = 'error';
                } else {
                    control.estado = 'incompleto';
                }
                const errorObj: any = {
                    message: error?.message || (typeof error === 'string' ? error : JSON.stringify(error)),
                    fecha: new Date()
                };
                if (error?.status) {
                    errorObj.status = error.status;
                }
                if (error?.name) {
                    errorObj.name = error.name;
                }
                control.ultimoError = errorObj;
                control.markModified('ultimoError');
                await logger.error('generarRecetasFaltantes:item', { controlId: control._id, tipo: control.tipo, intento: control.intento }, error);
            }

            try {
                if (typeof (control as any).audit === 'function') {
                    (control as any).audit(userScheduler);
                } else {
                    Auth.audit(control, { user: userScheduler } as any);
                }
                await control.save();
            } catch (errSave) {
                await logger.error('generarRecetasFaltantes:save', { controlId: control._id }, errSave);
            }
        }, { parallel: 1 });

        await logger.info('generarRecetasFaltantes:fin', { desde, hasta, resultados });
    } catch (err) {
        await logger.error('generarRecetasFaltantes:general', { desde, hasta, resultados }, err);
        if (callback) {
            return callback(err);
        }
        return;
    }

    if (callback) {
        callback();
    }
}

export = generarRecetasFaltantes;
