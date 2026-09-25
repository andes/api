/* eslint-disable no-console */
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { Auth } from '../auth/auth.class';
import { userScheduler } from '../config.private';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { InformeEstadistica } from '../modules/rup/internacion/informe-estadistica.schema';
import * as CamasEstadosController from '../modules/rup/internacion/cama-estados.controller';
import { Organizacion } from '../core/tm/schemas/organizacion';

/**
 * Script: MigracionInternacionInfEstadistico
 *
 * Migra TODAS las prestaciones de internación (ambito='internacion', conceptId='32485007')
 * a la nueva colección `internacionFormEstadistica`.
 *
 * Parámetros (posicionales via process.argv):
 *   [3] fechaDesde  - YYYY-MM-DD  (default: hace 30 días)
 *   [4] fechaHasta  - YYYY-MM-DD  (default: hoy fin de día)
 *   [5] organizacion - ObjectId   (opcional, filtra por solicitud.organizacion.id)
 *
 * El filtro de rango de fechas se aplica sobre `ejecucion.fecha` para cubrir
 * todas las prestaciones independientemente de si tienen informeIngreso o no.
 *
 * Ejemplo de uso:
 *   node jobs/manual.js scripts/MigracionInternacionInfEstadistico 2024-01-01 2024-01-31 59380153db8e90fe4602ec02
 */

const orgCache: Record<string, any> = {};

async function getOrganizacion(id: any) {
    if (!id) {
        return null;
    }
    const idStr = id.toString();
    if (!orgCache[idStr]) {
        const org = await Organizacion.findById(id).lean();
        orgCache[idStr] = org;
    }
    return orgCache[idStr];
}

async function resolveOrganizacion(prestacion: any) {
    const orgId = prestacion.solicitud?.organizacion?.id;
    if (orgId) {
        const fullOrg = await getOrganizacion(orgId);
        if (fullOrg) {
            return fullOrg;
        }
    }
    return {
        _id: orgId,
        nombre: prestacion.solicitud?.organizacion?.nombre
    };
}

async function run(done) {
    const fechaDesdeStr = process.argv[3];
    const fechaHastaStr = process.argv[4];
    const organizacionStr = process.argv[5];

    // ---------- Flexible date parsing ----------
    // acepta YYYY-MM-DD o un año (YYYY). Si solo se proporciona un año, se mapea
    // al rango completo del año (inicio del 1 de enero → fin del 31 de diciembre).
    const parseDate = (value: string, isStart: boolean): moment.Moment => {
        if (!value) {return null;}
        // Solo año (ej. "2025")
        if (/^\d{4}$/.test(value)) {
            return isStart ? moment(value, 'YYYY').startOf('year') : moment(value, 'YYYY').endOf('year');
        }
        // Fecha completa (YYYY-MM-DD)
        return isStart ? moment(value, 'YYYY-MM-DD').startOf('day') : moment(value, 'YYYY-MM-DD').endOf('day');
    };

    let start = parseDate(fechaDesdeStr, true) || moment().subtract(30, 'days').startOf('day');
    let end = parseDate(fechaHastaStr, false) || moment().endOf('day');

    // Si las fechas están invertidas (end antes que start) las intercambiamos y advertimos al usuario.
    if (end.isBefore(start)) {
        const tmp = start;
        start = end;
        end = tmp;
        console.warn('⚠︎ Fechas invertidas: se intercambiaron start y end.');
    }
    // -------------------------------------------

    if (!start.isValid() || !end.isValid()) {
        console.error('Error: fechaDesde o fechaHasta no son válidas. Formato esperado: YYYY-MM-DD');
        return done();
    }

    if (end.isBefore(start)) {
        console.error('Error: fechaHasta debe ser igual o posterior a fechaDesde.');
        return done();
    }

    // Sin límite de rango: el operador decide el tamaño del lote.
    // Para seguridad, se muestra una advertencia si supera 6 meses.
    const diffDays = end.diff(start, 'days');
    // if (diffDays > 180) {
    //     console.warn(`⚠ ADVERTENCIA: El rango de fechas es de ${diffDays} días. Considere reducirlo para evitar sobrecarga.`);
    // }

    console.log('\n========================================');
    console.log('  Migración Prestaciones de Internación');
    console.log('========================================');
    console.log(`Rango        : ${start.format('YYYY-MM-DD')} → ${end.format('YYYY-MM-DD')}`);
    console.log(`Organización : ${organizacionStr || '(todas)'}`);
    console.log('\n');

    // ── Diagnóstico progresivo ──────────────────────────────────────────────
    // Ejecuta conteos con cada filtro por separado para identificar cuál falla.
    try {
        console.log('── Diagnóstico de datos ──────────────────────────────────────');

        const c1 = await Prestacion.countDocuments({ 'solicitud.ambitoOrigen': 'internacion' });
        console.log(`[DIAG] ambitoOrigen=internacion                  : ${c1}`);

        const c1b = await Prestacion.countDocuments({ inicio: 'internacion' });
        console.log(`[DIAG] inicio=internacion                        : ${c1b}`);

        const c2 = await Prestacion.countDocuments({ 'solicitud.tipoPrestacion.conceptId': '32485007' });
        console.log(`[DIAG] tipoPrestacion.conceptId=32485007         : ${c2}`);

        const c3 = await Prestacion.countDocuments({
            'solicitud.ambitoOrigen': 'internacion',
            'solicitud.tipoPrestacion.conceptId': '32485007'
        });
        console.log(`[DIAG] ambitoOrigen + conceptId                  : ${c3}`);

        const c4 = await Prestacion.countDocuments({
            'solicitud.ambitoOrigen': 'internacion',
            'solicitud.tipoPrestacion.conceptId': '32485007',
            'ejecucion.fecha': { $gte: start.toDate(), $lte: end.toDate() }
        });
        console.log(`[DIAG] + ejecucion.fecha en rango                : ${c4}`);

        const c4b = await Prestacion.countDocuments({
            'solicitud.ambitoOrigen': 'internacion',
            'solicitud.tipoPrestacion.conceptId': '32485007',
            'solicitud.fecha': { $gte: start.toDate(), $lte: end.toDate() }
        });
        console.log(`[DIAG] + solicitud.fecha en rango                : ${c4b}`);

        const c4c = await Prestacion.countDocuments({
            'solicitud.ambitoOrigen': 'internacion',
            'solicitud.tipoPrestacion.conceptId': '32485007',
            createdAt: { $gte: start.toDate(), $lte: end.toDate() }
        });
        console.log(`[DIAG] + createdAt en rango                      : ${c4c}`);

        // Muestra un documento de internación de ejemplo (sin filtro de fecha)
        const sample = await Prestacion.findOne({
            'solicitud.ambitoOrigen': 'internacion',
            'solicitud.tipoPrestacion.conceptId': '32485007'
        }).select({
            _id: 1,
            inicio: 1,
            'solicitud.ambitoOrigen': 1,
            'solicitud.fecha': 1,
            'solicitud.tipoPrestacion.conceptId': 1,
            'ejecucion.fecha': 1,
            'estadoActual.tipo': 1,
            createdAt: 1
        }).lean();

        if (sample) {
            console.log('\n[DIAG] Ejemplo de documento de internación:');
            console.log(JSON.stringify(sample, null, 2));
        } else {
            console.log('\n[DIAG] No se encontró ningún documento con ambitoOrigen=internacion + conceptId=32485007');
            // Buscar cualquier internacion sin restriccion de conceptId
            const sampleAny = await Prestacion.findOne({
                'solicitud.ambitoOrigen': 'internacion'
            }).select({
                _id: 1,
                inicio: 1,
                'solicitud.ambitoOrigen': 1,
                'solicitud.fecha': 1,
                'solicitud.tipoPrestacion.conceptId': 1,
                'solicitud.tipoPrestacion.term': 1,
                'ejecucion.fecha': 1,
                'estadoActual.tipo': 1,
                createdAt: 1
            }).lean();
            if (sampleAny) {
                console.log('[DIAG] Ejemplo con solo ambitoOrigen=internacion (cualquier conceptId):');
                console.log(JSON.stringify(sampleAny, null, 2));
            }
        }
        console.log('─────────────────────────────────────────────────────────────\n');
    } catch (diagErr) {
        console.error('Error en diagnóstico:', diagErr.message);
    }

    // ── Query principal ──────────────────────────────────────────────────────
    // Filtramos por ejecucion.fecha para no depender del campo anidado
    // informeIngreso.fechaIngreso, que puede estar ausente en muchos documentos.
    const query: any = {
        'solicitud.ambitoOrigen': 'internacion',
        'solicitud.tipoPrestacion.conceptId': '32485007',
        'ejecucion.fecha': {
            $gte: start.toDate(),
            $lte: end.toDate()
        },
        'estadoActual.tipo': { $in: ['ejecucion', 'validada', 'anulada'] }
    };

    if (organizacionStr) {
        if (!mongoose.Types.ObjectId.isValid(organizacionStr)) {
            console.error('Error: El ID de organización no es un ObjectId válido.');
            return done();
        }
        query['solicitud.organizacion.id'] = mongoose.Types.ObjectId(organizacionStr);
    }

    console.log('Query MongoDB:');
    console.log(JSON.stringify(query, null, 2));
    console.log('\n');

    try {
        const totalEstimado = await Prestacion.countDocuments(query);
        console.log(`Total de prestaciones a procesar: ${totalEstimado}\n`);

        const cursor = Prestacion.find(query).cursor({ batchSize: 50 });

        let totalCount = 0;
        let successCount = 0;
        let errorCount = 0;
        const skipCount = 0;
        const processedIds: string[] = [];
        const skippedIds: string[] = [];
        const errorIds: string[] = [];

        for await (const doc of cursor) {
            totalCount++;
            const prestacion = doc as any;

            try {
                // ── 1. Extraer informeIngreso ─────────────────────────────────────
                const ingresoRegistro = prestacion.ejecucion?.registros?.find(
                    r => r.concepto?.conceptId === '721915006'
                );
                const rawIngreso = ingresoRegistro?.valor?.informeIngreso;

                // Para prestaciones sin informeIngreso usamos la fecha de ejecución como fallback.
                // NO las omitimos: el schema solo requiere fechaIngreso.
                const fechaIngresoFallback: Date = prestacion.ejecucion?.fecha
                    || prestacion.solicitud?.fecha
                    || new Date();

                if (!rawIngreso) {
                    console.warn(
                        `[WARN] Prestacion ${prestacion._id} no tiene informeIngreso. ` +
                        `Se usará ejecucion.fecha como fechaIngreso: ${fechaIngresoFallback.toISOString()}`
                    );
                }

                const mappedInformeIngreso: any = {
                    fechaIngreso: rawIngreso?.fechaIngreso
                        ? new Date(rawIngreso.fechaIngreso)
                        : fechaIngresoFallback,
                    especialidades: rawIngreso?.especialidades,
                    nroCarpeta: rawIngreso?.nroCarpeta,
                    motivo: rawIngreso?.motivo,
                    profesional: rawIngreso?.profesional ? {
                        id: rawIngreso.profesional.id || rawIngreso.profesional._id,
                        nombre: rawIngreso.profesional.nombre,
                        apellido: rawIngreso.profesional.apellido,
                        documento: rawIngreso.profesional.documento
                    } : undefined,
                    paseAunidadOrganizativa: rawIngreso?.paseAunidadOrganizativa
                        || rawIngreso?.PaseAunidadOrganizativa
                        || undefined
                };

                // Origen
                if (rawIngreso?.origen) {
                    if (typeof rawIngreso.origen === 'string') {
                        const orgOrigen = rawIngreso.organizacionOrigen;
                        mappedInformeIngreso.origen = {
                            tipo: rawIngreso.origen,
                            organizacionOrigen: orgOrigen
                                ? (typeof orgOrigen === 'string' ? { nombre: orgOrigen } : orgOrigen)
                                : undefined,
                            otraOrganizacion: rawIngreso.otraOrganizacion || undefined
                        };
                    } else {
                        const orgOrigen = rawIngreso.origen.organizacionOrigen;
                        mappedInformeIngreso.origen = {
                            tipo: rawIngreso.origen.tipo,
                            organizacionOrigen: orgOrigen
                                ? (typeof orgOrigen === 'string' ? { nombre: orgOrigen } : orgOrigen)
                                : undefined,
                            otraOrganizacion: rawIngreso.origen.otraOrganizacion || undefined
                        };
                    }
                }

                // Ocupación Habitual — null/undefined se ignora
                if (rawIngreso?.ocupacionHabitual != null && rawIngreso.ocupacionHabitual !== '') {
                    if (typeof rawIngreso.ocupacionHabitual === 'string') {
                        mappedInformeIngreso.ocupacionHabitual = {
                            nombre: rawIngreso.ocupacionHabitual
                        };
                    } else if (rawIngreso.ocupacionHabitual.nombre || rawIngreso.ocupacionHabitual.codigo) {
                        mappedInformeIngreso.ocupacionHabitual = {
                            codigo: rawIngreso.ocupacionHabitual.codigo || rawIngreso.ocupacionHabitual.id,
                            nombre: rawIngreso.ocupacionHabitual.nombre
                        };
                    }
                }

                // Situación Laboral — null/undefined se ignora
                if (rawIngreso?.situacionLaboral != null && rawIngreso.situacionLaboral !== '') {
                    if (typeof rawIngreso.situacionLaboral === 'string') {
                        mappedInformeIngreso.situacionLaboral = { nombre: rawIngreso.situacionLaboral };
                    } else if (rawIngreso.situacionLaboral.nombre) {
                        mappedInformeIngreso.situacionLaboral = {
                            id: rawIngreso.situacionLaboral.id || rawIngreso.situacionLaboral._id?.toString(),
                            nombre: rawIngreso.situacionLaboral.nombre
                        };
                    }
                }

                // Nivel de Instrucción — null/undefined se ignora
                if (rawIngreso?.nivelInstruccion != null && rawIngreso.nivelInstruccion !== '') {
                    if (typeof rawIngreso.nivelInstruccion === 'string') {
                        mappedInformeIngreso.nivelInstruccion = { nombre: rawIngreso.nivelInstruccion };
                    } else if (rawIngreso.nivelInstruccion.nombre) {
                        mappedInformeIngreso.nivelInstruccion = {
                            id: rawIngreso.nivelInstruccion.id || rawIngreso.nivelInstruccion._id?.toString(),
                            nombre: rawIngreso.nivelInstruccion.nombre
                        };
                    }
                }

                // Cobertura / Obra Social
                if (rawIngreso?.cobertura) {
                    mappedInformeIngreso.cobertura = {
                        tipo: rawIngreso.cobertura.tipo || rawIngreso.cobertura.nombre,
                        obraSocial: rawIngreso.cobertura.obraSocial ? {
                            id: mongoose.Types.ObjectId.isValid(
                                rawIngreso.cobertura.obraSocial.id || rawIngreso.cobertura.obraSocial._id
                            )
                                ? mongoose.Types.ObjectId(
                                    rawIngreso.cobertura.obraSocial.id || rawIngreso.cobertura.obraSocial._id
                                )
                                : undefined,
                            nombre: rawIngreso.cobertura.obraSocial.nombre,
                            codigoPuco: rawIngreso.cobertura.obraSocial.codigoPuco
                                || rawIngreso.cobertura.obraSocial.codigoFinanciador,
                            numeroAfiliado: rawIngreso.cobertura.obraSocial.numeroAfiliado
                        } : undefined
                    };
                } else if (rawIngreso?.obraSocial) {
                    const osId = rawIngreso.obraSocial.id || rawIngreso.obraSocial._id;
                    mappedInformeIngreso.cobertura = {
                        tipo: rawIngreso.asociado || undefined,
                        obraSocial: {
                            id: (osId && mongoose.Types.ObjectId.isValid(osId))
                                ? mongoose.Types.ObjectId(osId)
                                : undefined,
                            nombre: rawIngreso.obraSocial.nombre,
                            codigoPuco: rawIngreso.obraSocial.codigoPuco
                                || rawIngreso.obraSocial.codigoFinanciador,
                            financiador: rawIngreso.obraSocial.financiador || undefined,
                            numeroAfiliado: rawIngreso.obraSocial.numeroAfiliado
                        }
                    };
                } else if (rawIngreso?.asociado) {
                    // Solo tiene 'asociado' (tipo de cobertura) sin datos de obra social
                    mappedInformeIngreso.cobertura = {
                        tipo: rawIngreso.asociado
                    };
                }

                const informeIngreso = mappedInformeIngreso;

                // ── 2. Extraer informeEgreso ──────────────────────────────────────
                const egresoRegistro = prestacion.ejecucion?.registros?.find(
                    r => r.concepto?.conceptId === '58000006'
                );
                let informeEgreso = null;

                if (egresoRegistro?.valor?.InformeEgreso) {
                    const sourceEgreso = egresoRegistro.valor.InformeEgreso;

                    const mapCie10 = (diag: any) => {
                        if (!diag) {
                            return undefined;
                        }
                        return {
                            capitulo: diag.capitulo,
                            grupo: diag.grupo,
                            causa: diag.causa,
                            subcausa: diag.subcausa,
                            codigo: diag.codigo,
                            nombre: diag.nombre,
                            sinonimo: diag.sinonimo,
                            c2: diag.c2,
                            reporteC2: diag.reporteC2,
                            ficha: diag.ficha
                        };
                    };

                    const mappedProcedimientos = (sourceEgreso.procedimientosQuirurgicos || []).map(
                        (pq: any) => ({
                            fecha: pq.fecha ? new Date(pq.fecha) : undefined,
                            procedimiento: pq.procedimiento ? {
                                codigo: pq.procedimiento.codigo,
                                nombre: pq.procedimiento.nombre,
                                capitulo: pq.procedimiento.capitulo
                            } : undefined
                        })
                    );

                    let mappedTipoEgreso = null;
                    if (sourceEgreso.tipoEgreso) {
                        if (typeof sourceEgreso.tipoEgreso === 'string') {
                            mappedTipoEgreso = { nombre: sourceEgreso.tipoEgreso };
                        } else {
                            const destOrg = sourceEgreso.tipoEgreso.OrganizacionDestino
                                || sourceEgreso.tipoEgreso.organizacionDestino;
                            mappedTipoEgreso = {
                                id: sourceEgreso.tipoEgreso.id,
                                nombre: sourceEgreso.tipoEgreso.nombre,
                                OrganizacionDestino: typeof destOrg === 'string'
                                    ? { nombre: destOrg }
                                    : destOrg,
                                otraOrganizacion: sourceEgreso.tipoEgreso.otraOrganizacion
                            };
                        }
                    }

                    informeEgreso = {
                        fechaEgreso: sourceEgreso.fechaEgreso
                            ? new Date(sourceEgreso.fechaEgreso)
                            : undefined,
                        nacimientos: sourceEgreso.nacimientos,
                        procedimientosQuirurgicos: mappedProcedimientos,
                        causaExterna: sourceEgreso.causaExterna ? {
                            producidaPor: sourceEgreso.causaExterna.producidaPor,
                            lugar: sourceEgreso.causaExterna.lugar,
                            comoSeProdujo: sourceEgreso.causaExterna.comoSeProdujo
                        } : undefined,
                        diasDeEstada: sourceEgreso.diasDeEstada,
                        tipoEgreso: mappedTipoEgreso,
                        diagnosticos: {
                            principal: mapCie10(
                                sourceEgreso.diagnosticos?.principal
                                || sourceEgreso.diagnosticoPrincipal
                            ),
                            secundarios: (
                                sourceEgreso.diagnosticos?.secundarios
                                || sourceEgreso.otrosDiagnosticos
                                || []
                            ).map(mapCie10).filter(Boolean),
                            otrasCircunstancias: mapCie10(
                                sourceEgreso.diagnosticos?.otrasCircunstancias
                                || sourceEgreso.otrasCircunstancias
                            ),
                            diasEstadaOtrasCircunstancias:
                                sourceEgreso.diagnosticos?.diasEstadaOtrasCircunstancias
                                || sourceEgreso.diasEstadaOtrasCircunstancias,
                            diasDePermisoDeSalida:
                                sourceEgreso.diagnosticos?.diasDePermisoDeSalida
                                || sourceEgreso.diasDePermisoDeSalida
                        }
                    };
                }

                // ── 3. Resolver Organización ──────────────────────────────────────
                const organizacion = await resolveOrganizacion(prestacion);

                // ── 4. Movimientos y Unidad Organizativa ─────────────────────────
                let movimientos: any[] = [];
                const orgId = prestacion.solicitud?.organizacion?.id;

                if (orgId) {
                    try {
                        movimientos = await CamasEstadosController.searchEstados(
                            {
                                desde: moment(informeIngreso.fechaIngreso).subtract(1, 'day').toDate(),
                                hasta: new Date(),
                                organizacion: orgId,
                                capa: 'estadistica',
                                ambito: 'internacion'
                            },
                            { internacion: prestacion._id }
                        );
                        movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
                    } catch (errMov) {
                        console.error(
                            `[WARN] No se pudieron obtener movimientos para ${prestacion._id}:`,
                            errMov.message
                        );
                    }
                }

                const lastMov = movimientos[movimientos.length - 1];
                let unidadOrganizativa = prestacion.unidadOrganizativa;

                if (!unidadOrganizativa?.conceptId) {
                    unidadOrganizativa = lastMov?.unidadOrganizativa || {
                        conceptId: '309983005',
                        term: 'unidad de internación general',
                        fsn: 'unidad de internación general (medio ambiente)',
                        semanticTag: 'medio ambiente'
                    };
                }

                const cambiosCamas = movimientos.map(mov => ({
                    fecha: mov.fecha,
                    idCama: mov.idCama || mov._id,
                    unidadOrganizativa: mov.unidadOrganizativa
                }));

                // ── 5. Períodos Censables ─────────────────────────────────────────
                const periodosCensables = prestacion.periodosCensables?.length
                    ? prestacion.periodosCensables
                    : [{
                        desde: new Date(informeIngreso.fechaIngreso),
                        hasta: informeEgreso?.fechaEgreso
                            ? new Date(informeEgreso.fechaEgreso)
                            : null
                    }];

                // ── 6. Estados ────────────────────────────────────────────────────
                const tiposValidos = ['anulada', 'ejecucion', 'validada'];

                const estados = (prestacion.estados || [])
                    .filter(e => tiposValidos.includes(e.tipo))
                    .map(e => ({
                        tipo: e.tipo,
                        fecha: e.fecha || e.createdAt || new Date()
                    }));

                if (estados.length === 0) {
                    estados.push({
                        tipo: tiposValidos.includes(prestacion.estadoActual?.tipo)
                            ? prestacion.estadoActual.tipo
                            : 'ejecucion',
                        fecha: new Date(informeIngreso.fechaIngreso)
                    });
                }

                const estadoActual = {
                    tipo: tiposValidos.includes(prestacion.estadoActual?.tipo)
                        ? prestacion.estadoActual.tipo
                        : 'ejecucion'
                };

                // ── 7. Guardar en InformeEstadistica ──────────────────────────────
                await InformeEstadistica.deleteOne({ _id: prestacion._id });

                const nuevoInforme = new InformeEstadistica({
                    _id: prestacion._id,
                    organizacion,
                    unidadOrganizativa,
                    paciente: prestacion.paciente,
                    informeIngreso,
                    informeEgreso,
                    periodosCensables,
                    cambiosCamas,
                    estados,
                    estadoActual
                });

                Auth.audit(nuevoInforme, userScheduler as any);
                await nuevoInforme.save({ validateBeforeSave: true });

                const pacNombre = [
                    prestacion.paciente?.apellido,
                    prestacion.paciente?.nombre
                ].filter(Boolean).join(', ');

                const fechaIngresoLabel = informeIngreso.fechaIngreso.toISOString().slice(0, 10);
                console.log(`[OK]   ${prestacion._id} | ${pacNombre || 'Sin nombre'} | fechaIngreso: ${fechaIngresoLabel}`);
                processedIds.push(prestacion._id.toString());
                successCount++;

            } catch (errDoc) {
                console.error(`[ERROR] Prestacion ${prestacion._id}:`, errDoc.message || errDoc);
                errorIds.push(prestacion._id.toString());
                errorCount++;
            }
        }

        // ── Resumen ───────────────────────────────────────────────────────────────
        console.log('\n========================================');
        console.log('  Migración Finalizada');
        console.log('========================================');
        console.log(`Total encontrados : ${totalEstimado}`);
        console.log(`Total procesados  : ${totalCount}`);
        console.log(`✓ Exitosos        : ${successCount}`);
        console.log(`- Omitidos        : ${skipCount}`);
        console.log(`✗ Con error       : ${errorCount}`);

        if (processedIds.length) {
            console.log(`\nIDs migrados (${processedIds.length}):`);
            processedIds.forEach(id => console.log(`  ✓ ${id}`));
        }
        if (skippedIds.length) {
            console.log(`\nIDs omitidos (${skippedIds.length}):`);
            skippedIds.forEach(id => console.log(`  - ${id}`));
        }
        if (errorIds.length) {
            console.log(`\nIDs con error (${errorIds.length}):`);
            errorIds.forEach(id => console.log(`  ✗ ${id}`));
        }

    } catch (e) {
        console.error('Error crítico durante la migración:', e);
    }

    done();
}

export = run;
