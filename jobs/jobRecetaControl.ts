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

/**
 * Job: generarRecetasFaltantes
 *
 * Recorre la colección auxiliar `recetaPendiente` buscando registros
 * `realizada: false` dentro de un rango de fechas/horas, reconstruye los
 * datos necesarios desde `Prestacion` y crea la receta faltante.
 *
 * Soporta tres tipos de prescripción:
 *   - 'medicamento' y 'magistral' -> comparten flujo/colección (Receta / crearReceta),
 *     se diferencian internamente por `medicamento.tipoReceta`.
 *   - 'insumo' -> flujo/colección separados (RecetaInsumo / crearRecetaInsumo).
 *
 * Parametrización (recibida por args, ver bin/jobsDaemon.js):
 *   --desde   YYYY-MM-DD[THH:mm]   (opcional)
 *   --hasta   YYYY-MM-DD[THH:mm]   (opcional, default: ahora)
 *   --horas   N                    (opcional, alternativa a --desde: últimas N horas)
 *
 * Uso típico (jobsDaemon):
 *   node bin/jobsDaemon.js generarRecetasFaltantes --horas 6
 *   node bin/jobsDaemon.js generarRecetasFaltantes --desde 2024-05-01 --hasta 2024-05-02
 */

interface ParamsJob {
    desde?: string;
    hasta?: string;
    horas?: number;
}

function resolverRangoFechas(params: ParamsJob) {
    const hasta = params.hasta ? moment(params.hasta) : moment();

    let desde;
    if (params.desde) {
        desde = moment(params.desde);
    } else {
        const horas = params.horas && Number(params.horas) > 0 ? Number(params.horas) : 24;
        desde = moment(hasta).subtract(horas, 'hours');
    }

    return { desde: desde.toDate(), hasta: hasta.toDate() };
}

/**
 * Datos comunes a los tres tipos de prescripción: prestación, registro RUP
 * y organización. Reconstruye lo mismo que arman los listeners
 * `prestacion:receta:create` y `prestacion:recetaInsumo:create` antes de
 * llamar a crearReceta/crearRecetaInsumo.
 */
async function reconstruirContexto(pendiente: any) {
    const prestacion: any = await Prestacion.findById(pendiente.idPrestacion);
    if (!prestacion) {
        throw new Error(`No se encontró la prestación ${pendiente.idPrestacion}`);
    }

    // Supuesto a confirmar: tanto medicamentos como magistrales viven en el mismo
    // array `registro.valor.medicamentos` (se diferencian por `tipoReceta`), e insumos
    // en `registro.valor.insumos`. Si el modelo real difiere, ajustar este lookup.
    const registro = (prestacion.ejecucion?.registros || []).find((r: any) => String(r._id) === String(pendiente.idRegistro))
        || (prestacion.evolucion || []).find((r: any) => String(r._id) === String(pendiente.idRegistro))
        || (prestacion.solicitud?.registros || []).find((r: any) => String(r._id) === String(pendiente.idRegistro));

    if (!registro) {
        throw new Error(`No se encontró el registro ${pendiente.idRegistro} en la prestación ${pendiente.idPrestacion}`);
    }

    const organizacion = {
        id: prestacion.ejecucion.organizacion.id,
        nombre: prestacion.ejecucion.organizacion.nombre
    };

    return { prestacion, registro, organizacion };
}

/** Resuelve profesional para medicamento/magistral: por documento del createdBy o de la solicitud. */
async function resolverProfesionalReceta(prestacion: any) {
    const documentoProfesional = prestacion.estadoActual.createdBy?.documento
        ? prestacion.estadoActual.createdBy?.documento
        : prestacion.solicitud.profesional.documento;

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

/** Resuelve profesional para insumo: directamente desde prestacion.solicitud.profesional (igual que el listener). */
async function resolverProfesionalInsumo(prestacion: any) {
    const profPrestacion = prestacion.solicitud.profesional;
    const { profesionGrado, matriculaGrado, especialidades } = await getProfesionActualizada(profPrestacion.id);

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

/** Rama medicamento/magistral: comparten Receta + crearReceta. */
async function crearFaltantesMedicamento(pendiente: any) {
    const { prestacion, registro, organizacion } = await reconstruirContexto(pendiente);
    const profesional = await resolverProfesionalReceta(prestacion);

    const pacienteCUIL = prestacion.paciente.cuil || generarCUIL(prestacion.paciente.documento, prestacion.paciente.sexo);
    const pacienteObj = (typeof prestacion.paciente.toObject === 'function') ? prestacion.paciente.toObject() : prestacion.paciente;
    const paciente = { ...pacienteObj, id: pacienteObj.id || pacienteObj._id || prestacion.paciente.id || prestacion.paciente._id, cuil: pacienteCUIL };

    const dataRecetaBase = {
        idPrestacion: prestacion.id,
        idRegistro: pendiente.idRegistro,
        fechaRegistro: prestacion.ejecucion.fecha || moment().toDate(),
        fechaPrestacion: prestacion.ejecucion.fecha,
        paciente,
        profesional,
        organizacion,
        medicamento: null,
        diagnostico: null,
    };

    const medicamentos = registro.valor?.medicamentos || [];
    const recetasCreadas = [];
    for (const medicamento of medicamentos) {
        const conceptId = medicamento?.concepto?.conceptId || medicamento?.generico?.conceptId;
        if (!conceptId) {
            continue;
        }

        const yaExiste = await Receta.findOne({
            'medicamento.concepto.conceptId': conceptId,
            idRegistro: pendiente.idRegistro
        });

        if (yaExiste) {
            recetasCreadas.push(yaExiste);
            continue;
        }

        const dataReceta = {
            ...dataRecetaBase,
            medicamento,
            diagnostico: medicamento?.diagnostico || null,
        };

        const creadas = await crearReceta(dataReceta, userScheduler);
        if (Array.isArray(creadas)) {
            recetasCreadas.push(...creadas);
        }
    }

    if (!recetasCreadas.length) {
        throw new Error('No se pudo crear ninguna receta de medicamento/magistral (sin items válidos en el registro)');
    }

    return recetasCreadas;
}

/** Rama insumo: RecetaInsumo + crearRecetaInsumo. */
async function crearFaltantesInsumo(pendiente: any) {
    const { prestacion, registro, organizacion } = await reconstruirContexto(pendiente);
    const profesional = await resolverProfesionalInsumo(prestacion);

    const pacienteObj = (typeof prestacion.paciente.toObject === 'function') ? prestacion.paciente.toObject() : prestacion.paciente;
    const paciente = { ...pacienteObj, id: pacienteObj.id || pacienteObj._id || prestacion.paciente.id || prestacion.paciente._id };

    const dataRecetaBase = {
        idPrestacion: prestacion.id,
        idRegistro: pendiente.idRegistro,
        fechaRegistro: prestacion.ejecucion.fecha || moment().toDate(),
        fechaPrestacion: prestacion.ejecucion.fecha,
        paciente,
        profesional,
        organizacion,
        insumo: null,
        diagnostico: null,
    };

    const insumos = registro.valor?.insumos || [];
    const recetasCreadas = [];

    for (const insumo of insumos) {
        const idGenerico = insumo?.generico?.id;
        const nombreGenerico = insumo?.generico?.nombre;
        if (!idGenerico || !nombreGenerico) {
            continue;
        }

        const yaExiste = await RecetaInsumo.findOne({
            'insumo.id': idGenerico,
            'insumo.nombre': nombreGenerico,
            idRegistro: pendiente.idRegistro
        });

        if (yaExiste) {
            recetasCreadas.push(yaExiste);
            continue;
        }

        const dataRecetaInsumo = {
            ...dataRecetaBase,
            insumo
        };

        const creadas = await crearRecetaInsumo(dataRecetaInsumo, { user: userScheduler });
        if (Array.isArray(creadas)) {
            recetasCreadas.push(...creadas);
        }
    }

    if (!recetasCreadas.length) {
        throw new Error('No se pudo crear ninguna receta de insumo (sin items válidos en el registro)');
    }

    return recetasCreadas;
}

async function crearRecetaFaltante(pendiente: any) {
    switch (pendiente.tipoPrescripcion) {
        case 'medicamento':
        case 'magistrales':
            return crearFaltantesMedicamento(pendiente);
        case 'insumos':
            return crearFaltantesInsumo(pendiente);
        default:
            throw new Error(`tipoPrescripcion '${pendiente.tipoPrescripcion}' no soportado por el job`);
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
        creadas: 0,
        errores: 0,
        porTipo: { medicamento: 0, magistrales: 0, insumos: 0 }
    };

    try {
        const query = {
            creada: false,
            createdAt: { $gte: desde, $lte: hasta }
        };

        const cursor = RecetaControl.find(query).cursor({ batchSize: 50 });

        await cursor.eachAsync(async (pendiente: any) => {
            resultados.total++;
            try {
                const recetas = await crearRecetaFaltante(pendiente);

                pendiente.creada = true;
                pendiente.idReceta = recetas[0]?.idReceta || recetas[0]?._id?.toString() || null;
                if (typeof (pendiente as any).audit === 'function') {
                    (pendiente as any).audit(userScheduler);
                }
                await pendiente.save();

                resultados.creadas++;
                resultados.porTipo[pendiente.tipoPrescripcion] = (resultados.porTipo[pendiente.tipoPrescripcion] || 0) + 1;
            } catch (error) {
                resultados.errores++;
                await logger.error('generarRecetasFaltantes', { idPendiente: pendiente.id, tipoPrescripcion: pendiente.tipoPrescripcion }, error);
            }
        }, { parallel: 1 });

        await logger.info('generarRecetasFaltantes', { desde, hasta, resultados });
    } catch (err) {
        await logger.error('generarRecetasFaltantes', { desde, hasta, resultados }, err);
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
