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
 *   --hasta   YYYY-MM-DD[THH:mm]   (opcional, default: ahora - 1 min)
 *   --horas   N                    (opcional, default: últimas 24 horas)
 */

interface ParamsJob {
    desde?: string;
    hasta?: string;
    horas?: number;
}

function resolverRangoFechas(params: ParamsJob) {
    // Por defecto se resta 1 minuto al hasta para evitar procesar registros que se estén validando en el instante actual
    const hasta = params.hasta ? moment(params.hasta).toDate() : moment().subtract(1, 'minute').toDate();

    let desde: Date;
    if (params.desde) {
        desde = moment(params.desde).toDate();
    } else {
        const horas = params.horas && Number(params.horas) > 0 ? Number(params.horas) : 24;
        desde = moment(hasta).subtract(horas, 'hours').toDate();
    }

    return { desde, hasta };
}

/**
 * Reconstruye el contexto común: prestación, registro RUP y organización.
 */
async function reconstruirContexto(control: any) {
    const prestacion: any = await Prestacion.findById(control.prestacionId);
    if (!prestacion) {
        throw new Error(`No se encontró la prestación ${control.prestacionId}`);
    }

    const registros = prestacion.getRegistros ? prestacion.getRegistros() : (prestacion.ejecucion?.registros || []);
    const registro = (registros || []).find((r: any) => String(r._id) === String(control.registroId))
        || (prestacion.evolucion || []).find((r: any) => String(r._id) === String(control.registroId))
        || (prestacion.solicitud?.registros || []).find((r: any) => String(r._id) === String(control.registroId));

    if (!registro) {
        throw new Error(`No se encontró el registro ${control.registroId} en la prestación ${control.prestacionId}`);
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
        idRegistro: control.registroId,
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
    const conceptIdControl = control.codigo?.conceptId || (typeof control.codigo === 'string' ? control.codigo : null);

    // Buscamos el medicamento correspondiente a este control
    const medicamento = medicamentos.find((m: any) => {
        if (esMagistral) {
            return m.esMagistral && (m.magistral?.nombre === control.nombre || m.magistral?.codigo === control.codigo);
        }
        const cId = m.concepto?.conceptId || m.generico?.conceptId;
        return cId && (cId === conceptIdControl || m.concepto?.term === control.nombre || m.generico?.term === control.nombre);
    }) || medicamentos[0]; // fallback al primero si no hubo match estricto

    if (!medicamento) {
        throw new Error(`No se encontró el medicamento en el registro ${control.registroId}`);
    }

    const dataReceta = {
        ...dataRecetaBase,
        medicamento,
        diagnostico: medicamento?.diagnostico || null,
    };

    // Crear las recetas faltantes de forma idempotente
    await crearReceta(dataReceta, userScheduler);

    // Recuperamos todas las recetas en DB para sincronizar control.recetas
    const queryRecetasDb: any = {
        idPrestacion: prestacion.id,
        idRegistro: control.registroId
    };
    if (esMagistral) {
        queryRecetasDb['medicamento.magistral.nombre'] = medicamento.magistral?.nombre || control.nombre;
    } else if (conceptIdControl || medicamento.concepto?.conceptId || medicamento.generico?.conceptId) {
        queryRecetasDb['medicamento.concepto.conceptId'] = conceptIdControl || medicamento.concepto?.conceptId || medicamento.generico?.conceptId;
    }

    const recetasEnDb = await Receta.find(queryRecetasDb);

    if (!Array.isArray(control.recetas)) {
        control.recetas = [];
    }

    for (const r of recetasEnDb) {
        const orden = r.medicamento?.ordenTratamiento ?? 0;
        const indexExistente = control.recetas.findIndex((item: any) =>
            (item.recetaId && String(item.recetaId) === String(r._id)) || item.ordenTratamiento === orden
        );
        const itemReceta = {
            idReceta: r.idReceta || r._id.toString(),
            recetaId: r._id,
            ordenTratamiento: orden,
            origen: 'job',
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
        idRegistro: control.registroId,
        fechaRegistro: prestacion.ejecucion?.fecha || moment().toDate(),
        fechaPrestacion: prestacion.ejecucion?.fecha,
        paciente,
        profesional,
        organizacion,
        insumo: null,
        diagnostico: null,
    };

    const insumos = registro.valor?.insumos || [];
    const insumoIdControl = control.codigo?.id || (typeof control.codigo === 'string' ? control.codigo : null);

    const insumo = insumos.find((ins: any) => {
        const insId = ins.generico?.id || ins.id;
        return (insId && insId === insumoIdControl) || ins.generico?.nombre === control.nombre || ins.nombre === control.nombre;
    }) || insumos[0];

    if (!insumo) {
        throw new Error(`No se encontró el insumo en el registro ${control.registroId}`);
    }

    const dataRecetaInsumo = {
        ...dataRecetaBase,
        insumo
    };

    await crearRecetaInsumo(dataRecetaInsumo, { user: userScheduler });

    const insumoId = insumo.generico?.id || insumo.id;
    const queryInsumosDb: any = {
        idPrestacion: prestacion.id,
        idRegistro: control.registroId
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
        const indexExistente = control.recetas.findIndex((item: any) =>
            (item.recetaId && String(item.recetaId) === String(r._id)) || item.ordenTratamiento === orden
        );
        const itemReceta = {
            idReceta: r.idReceta || r._id.toString(),
            recetaId: r._id,
            ordenTratamiento: orden,
            origen: 'job',
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
        process.argv.forEach(val => {
            if (val.startsWith('--desde=')) {
                actualParams.desde = val.split('=')[1];
            } else if (val === '--desde') {
                const idx = process.argv.indexOf('--desde');
                if (idx !== -1 && process.argv[idx + 1]) {
                    actualParams.desde = process.argv[idx + 1];
                }
            }
            if (val.startsWith('--hasta=')) {
                actualParams.hasta = val.split('=')[1];
            } else if (val === '--hasta') {
                const idx = process.argv.indexOf('--hasta');
                if (idx !== -1 && process.argv[idx + 1]) {
                    actualParams.hasta = process.argv[idx + 1];
                }
            }
            if (val.startsWith('--horas=')) {
                actualParams.horas = parseInt(val.split('=')[1], 10);
            } else if (val === '--horas') {
                const idx = process.argv.indexOf('--horas');
                if (idx !== -1 && process.argv[idx + 1]) {
                    actualParams.horas = parseInt(process.argv[idx + 1], 10);
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
        // Se procesan todos los estados que no sean 'completo' ni 'suspendido', con máximo 3 intentos
        const query = {
            estado: { $in: ['pendiente', 'incompleto'] },
            intento: { $lt: 3 },
            createdAt: { $gte: desde, $lte: hasta }
        };

        const cursor = RecetaControl.find(query).cursor({ batchSize: 50 });

        await cursor.eachAsync(async (control: any) => {
            resultados.total++;
            control.intento = (control.intento || 0) + 1;
            control.fechaUltimoIntento = new Date();

            try {
                await procesarControl(control);

                if (control.recetas.length >= control.total) {
                    control.estado = 'completo';
                    control.ultimoError = null;
                    resultados.completas++;
                } else {
                    control.estado = 'incompleto';
                    resultados.incompletas++;
                }

                if (control.tipo && resultados.porTipo[control.tipo] !== undefined) {
                    resultados.porTipo[control.tipo]++;
                }
            } catch (error: any) {
                resultados.errores++;
                control.estado = 'incompleto';
                control.ultimoError = error?.message || String(error);
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
