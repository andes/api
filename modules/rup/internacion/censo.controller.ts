import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Prestacion } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
import { Camas } from './camas.schema';
import { Censo } from './censos.schema';
import { InternacionResumen } from './resumen/internacion-resumen.schema';
import { internacionCensosLog as logger } from './internacion.log';
import { userScheduler } from '../../../config.private';
import { InformeEstadistica } from './informe-estadistica.schema';

/**
 * Agrupa por cierta key. Por cada valor genera un array de esos elementos
 */
const groupBy = (xs: any[], key: string) => {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

/**
 * Concatena el estado a cierta hora con los movimientos. Casos:
 *    - internacion presente a cierta hora y tiene movimientos (viene de días anteriores)
 *    - internacion presente a cierta hora y no tiene movimientos (viene de días anteriores)
 *    - internacion no presente a cierta hora pero tiene movimientos (ingresa el día de la fecha)
 */

async function unificarMovimientos(snapshots, movimientos) {
    const internacionIDSFromSnapshots = Object.keys(snapshots).filter(snap => mongoose.Types.ObjectId.isValid(snap));
    const internacionIDSFromMovimientos = Object.keys(movimientos).filter(snap => mongoose.Types.ObjectId.isValid(snap));

    const idInternacionesUnicos = [
        ...new Set([...internacionIDSFromSnapshots, ...internacionIDSFromMovimientos])
    ];

    const mapping = {};
    idInternacionesUnicos.forEach(idInternacion => {
        const snapArr = snapshots[idInternacion] || [];
        const movArr = movimientos[idInternacion] || [];


        mapping[idInternacion] = [...snapArr, ...movArr];

        mapping[idInternacion].sort((a, b) => (a.fecha - b.fecha));


        const ultimo = mapping[idInternacion][mapping[idInternacion].length - 1];


    });


    return mapping;
}
function incluyePeriodo(estadistico, date) {


    if (!estadistico || !estadistico.periodosCensables) {
        return false;
    }


    const resultado = estadistico.periodosCensables.length
        ? estadistico.periodosCensables.some(periodo => {

            if (periodo.hasta) {
                const dentro = date.isBetween(periodo.desde, periodo.hasta, undefined, '[]');
                return dentro;
            } else {
                const after = date.isSameOrAfter(periodo.desde);
                return after;
            }
        })
        : true;


    return resultado;
}


function eliminarPeriodoEnEgreso(fechaEgreso, periodosCensables) {


    if (!fechaEgreso) {
        return periodosCensables;
    }

    const egreso = moment(fechaEgreso);

    const resultado = periodosCensables
        .map((periodo, idx) => {

            const desde = moment(periodo.desde);
            const hasta = periodo.hasta ? moment(periodo.hasta) : null;

            if (hasta && hasta.isBefore(egreso)) {
                return periodo;
            }

            const egresoDentro =
                egreso.isSameOrAfter(desde) &&
                (!hasta || egreso.isBefore(hasta));

            if (egresoDentro) {
                return {
                    ...periodo,
                    hasta: egreso.toDate()
                };
            }

            if (desde.isAfter(egreso)) {
                return null;
            }

            return periodo;
        })
        .filter(p => {
            const keep = p !== null;
            return keep;
        });


    return resultado;
}


async function realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, capa) {
    let prestaciones;
    let informes;
    let resumenPrestacionMap: any = [];
    const internacionKeys = Object.keys(internaciones);

    if (capa === 'medica') {// solo para efectores -> estadistica-v2
        const condicion1 = { _id: { $in: [...Object.keys(internaciones)] } };// busca resumen de internacion por id.
        const condicion2 = { idPrestacion: { $exists: true } };// que exista idPrestacion.
        const resumenes = await InternacionResumen.find({ $and: [condicion1, condicion2] });
        resumenPrestacionMap = resumenes.map(r => { return { idPrestacion: r.idPrestacion, idResumen: r.id }; });
        prestaciones = await Prestacion.find({ _id: { $in: resumenPrestacionMap.map(r => r.idPrestacion) } });
    } else {
        informes = await InformeEstadistica.find({ _id: { $in: [...Object.keys(internaciones)] } });;
    }

    let existenciaALas0 = 0;
    let existenciaALas24 = 0;
    let ingresos = 0;
    let pasesDe = 0;
    let altas = 0;
    let defunciones = 0;
    let pasesA = 0;
    let ingresosYEgresos = 0;
    let disponibles = 0;
    let diasEstada = 0;
    const arrayCamas = [];
    const tablaPacientes = {};
    const idInternaciones = Object.keys(internaciones);
    const dataInternaciones = {};

    for (const idInter of idInternaciones) {
        dataInternaciones[idInter] = {};
        const filtros = { internacion: idInter };
        const ambito = 'internacion';
        const allMovimientos = internaciones[idInter];
        const organizacion = allMovimientos[0].organizacion._id;
        const ultimoMovimientoUO = allMovimientos.slice().reverse().find(m => m.unidadOrganizativa.conceptId === unidadOrganizativa);
        let prestacion;
        let estadistico;
        if (capa === 'medica') {
            const idPrestacion = resumenPrestacionMap.find(r => String(r.idResumen) === String(allMovimientos[0].idInternacion))?.idPrestacion;
            prestacion = prestaciones.find(p => String(p.id) === String(idPrestacion));
        } else {
            estadistico = informes.find(p => String(p.id) === String(allMovimientos[0].idInternacion));

            const informesEstadistico: any = getInformesInternacion(estadistico);
            const fechaEgreso = informesEstadistico?.informeEgreso?.fechaEgreso;
            if (fechaEgreso) {
                estadistico.periodosCensables =
                    eliminarPeriodoEnEgreso(
                        fechaEgreso,
                        estadistico.periodosCensables
                    );
            }
            if (!incluyePeriodo(estadistico, timestampStart)) {
                // estadistico = null;
            }
        }

        if (estadistico) {
            const informesInternacion: any = getInformesInternacion(estadistico);
            const desde = informesInternacion.informeIngreso.fechaIngreso;
            dataInternaciones[idInter] = {};
            dataInternaciones[idInter]['informesInternacion'] = informesInternacion;
            if (ultimoMovimientoUO) {
                const estadosInter = await CamasEstadosController.searchEstados({ desde, hasta: timestampEnd, organizacion, ambito, capa }, filtros);

                const movimientosUO = estadosInter.filter(e => e.unidadOrganizativa.conceptId === unidadOrganizativa);
                const movIngUO = movimientosUO.filter(e => e.extras && e.extras.unidadOrganizativaOrigen &&
                    e.extras.unidadOrganizativaOrigen.conceptId !== unidadOrganizativa);
                const movEgresaUO = estadosInter.filter(e => e.extras && e.extras.unidadOrganizativaOrigen &&
                    e.extras.unidadOrganizativaOrigen.conceptId === unidadOrganizativa);

                let fechaIngresoUO = null;

                if (movimientosUO.length) {
                    movimientosUO.sort((a, b) => (a.fecha - b.fecha));
                    fechaIngresoUO = movimientosUO[0]?.fecha;

                    if (movIngUO.length) { // obtengo el ultimo ingreso a la UO
                        movIngUO.sort((a, b) => (b.fecha - a.fecha));
                        fechaIngresoUO = movIngUO[0].fecha;
                    }
                }

                let esPaseA = false;

                if (movEgresaUO.length) {
                    movEgresaUO.sort((a, b) => (b.fecha - a.fecha));
                    // si se egresa de la UO el mismo dia de consulta en el censo
                    esPaseA = moment(movEgresaUO[0].fecha).isSame(timestampEnd, 'day');
                }
                dataInternaciones[idInter]['allMovimientos'] = allMovimientos;
                dataInternaciones[idInter]['ultimoMovimientoUO'] = ultimoMovimientoUO;
                dataInternaciones[idInter]['fechaIngresoUO'] = fechaIngresoUO;
                dataInternaciones[idInter]['estadistico'] = estadistico;
                dataInternaciones[idInter]['esPaseA'] = esPaseA;
            }
        }
    }
    idInternaciones.map(async idInter => {
        const allMovimientos = dataInternaciones[idInter]['allMovimientos'];
        if (!internaciones || !allMovimientos) {
            return;
        }
        const estadistico = dataInternaciones[idInter]['estadistico'];
        const ultimoMovimiento = allMovimientos[allMovimientos.length - 1];
        const estadisticoInternacion = (estadistico as any);
        const ultimoMovimientoUO = dataInternaciones[idInter]['ultimoMovimientoUO'];
        const indiceCama = arrayCamas.findIndex(x => x.toString() === ultimoMovimiento.idCama.toString());
        if (!estadistico) {
            return;
        } else if (estadisticoInternacion.esCensable && indiceCama === -1) {
            arrayCamas.push(ultimoMovimiento.idCama);
            disponibles++;
        }
        const esPaseA = dataInternaciones[idInter]['esPaseA'];
        const informesInternacion = dataInternaciones[idInter]['informesInternacion'];
        const fechaIngreso = informesInternacion?.informeIngreso?.fechaIngreso || null;
        const fechaEgreso = informesInternacion?.informeEgreso?.fechaEgreso || null;
        const fechaIngresoUO = dataInternaciones[idInter]['fechaIngresoUO'] || fechaIngreso;
        const primerUO = allMovimientos[0].unidadOrganizativa.conceptId;
        const ultimaUO = ultimoMovimiento.unidadOrganizativa.conceptId;
        let ingresoEgresoCargado = false;
        let diasEstadaUO = 0;
        function checkPaciente(movimiento) {
            if (!tablaPacientes[movimiento.paciente.id]) {
                tablaPacientes[movimiento.paciente.id] = {
                    datos: {
                        paciente: movimiento.paciente,
                        cama: {
                            nombre: movimiento.nombre,
                            tipoCama: movimiento.tipoCama,
                            sectores: movimiento.sectores
                        },
                    },
                    actividad: []
                };
            }
        }
        const egresaDiaCenso = fechaEgreso && (moment(fechaEgreso).isSameOrBefore(timestampEnd.toDate()));

        if (fechaIngresoUO && (egresaDiaCenso || esPaseA)) {
            diasEstadaUO = timestampEnd.diff(fechaIngresoUO, 'days');
            diasEstadaUO = (diasEstadaUO === 0) ? 1 : diasEstadaUO;
        }

        const tipoEgresoId = informesInternacion?.informeEgreso?.tipoEgreso?.id || null;
        if (fechaEgreso) {
            if ((primerUO === unidadOrganizativa) && (ultimaUO === unidadOrganizativa)) {
                if (moment(fechaEgreso).isSame(fechaIngreso, 'day')) {
                    ingresosYEgresos++;
                    ingresoEgresoCargado = true;
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                        ingreso: 'SI',
                        fechaIngreso,
                        egreso: informesInternacion?.informeEgreso?.tipoEgreso?.id || null,
                        diasEstada: diasEstadaUO,
                        cama: {
                            nombre: ultimoMovimiento.nombre,
                            tipoCama: ultimoMovimiento.tipoCama,
                            sectores: ultimoMovimiento.sectores
                        },
                        paciente: ultimoMovimiento.paciente
                    });
                }
            }
            if (ultimaUO === String(unidadOrganizativa)) {
                if (egresaDiaCenso) {

                    if (tipoEgresoId === 'defuncion') {
                        defunciones++;
                    } else {
                        altas++;
                    }
                    if (!ingresoEgresoCargado) {
                        checkPaciente(ultimoMovimiento);
                        tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                            fechaIngreso,
                            egreso: informesInternacion?.informeEgreso?.tipoEgreso?.id || null,
                            diasEstada: diasEstadaUO,
                            cama: {
                                nombre: ultimoMovimiento.nombre,
                                tipoCama: ultimoMovimiento.tipoCama,
                                sectores: ultimoMovimiento.sectores
                            },
                            paciente: ultimoMovimiento.paciente

                        });
                    }
                }
            }
        }

        if (primerUO === unidadOrganizativa) {
            if (moment(fechaIngreso).isBefore(timestampStart.toDate())) {
                existenciaALas0++;
                checkPaciente(ultimoMovimientoUO);
                tablaPacientes[ultimoMovimientoUO.paciente.id].actividad.push({
                    ingreso: null,
                    fechaIngreso,
                    paseDe: null,
                    egreso: null,
                    paseA: null,
                    diasEstada: diasEstadaUO || null,
                    cama: {
                        nombre: ultimoMovimiento.nombre,
                        tipoCama: ultimoMovimiento.tipoCama,
                        sectores: ultimoMovimiento.sectores
                    },
                    paciente: ultimoMovimiento.paciente

                });
            } else if (moment(fechaIngreso).isSameOrAfter(timestampStart.toDate())) {
                ingresos++;
                if (!ingresoEgresoCargado) {
                    checkPaciente(ultimoMovimientoUO);
                    tablaPacientes[ultimoMovimientoUO.paciente.id].actividad.push({
                        ingreso: 'SI',
                        fechaIngreso,
                        diasEstada: diasEstadaUO || null,
                        cama: {
                            nombre: ultimoMovimiento.nombre,
                            tipoCama: ultimoMovimiento.tipoCama,
                            sectores: ultimoMovimiento.sectores
                        },
                        paciente: ultimoMovimiento.paciente

                    });
                }
            }
        }

        let movimientoAnterior;
        for (const movimiento of allMovimientos) {
            if (movimientoAnterior && movimientoAnterior.unidadOrganizativa.conceptId !== movimiento.unidadOrganizativa.conceptId) {
                if (movimientoAnterior.unidadOrganizativa.conceptId !== unidadOrganizativa && movimiento.unidadOrganizativa.conceptId === unidadOrganizativa) {
                    pasesDe++;
                    checkPaciente(movimiento);
                    tablaPacientes[movimiento.paciente.id].actividad.push({
                        paseDe: movimientoAnterior.unidadOrganizativa.term,
                        fechaIngreso,
                        diasEstada: null,
                        cama: {
                            nombre: movimiento.nombre,
                            tipoCama: movimiento.tipoCama,
                            sectores: movimiento.sectores
                        },
                        paciente: movimiento.paciente

                    });
                } else {
                    if (movimientoAnterior.unidadOrganizativa.conceptId === unidadOrganizativa && movimiento.unidadOrganizativa.conceptId !== unidadOrganizativa) {
                        pasesA++;
                        checkPaciente(movimientoAnterior);
                        tablaPacientes[movimiento.paciente.id].actividad.push({
                            paseA: movimiento.unidadOrganizativa.term,
                            fechaIngreso,
                            diasEstada: diasEstadaUO,
                            cama: {
                                nombre: movimiento.nombre,
                                tipoCama: movimiento.tipoCama,
                                sectores: movimiento.sectores
                            },
                            paciente: movimiento.paciente

                        });
                    }
                }
            }
            movimientoAnterior = movimiento;
        }
        diasEstada += diasEstadaUO;
    });

    existenciaALas24 = existenciaALas0 + ingresos + pasesDe - altas - defunciones - pasesA;

    return {
        pacientes: tablaPacientes,
        censo: {
            existenciaALas0,
            ingresos,
            pasesDe,
            altas,
            defunciones,
            pasesA,
            existenciaALas24,
            ingresosYEgresos,
            pacientesDia: existenciaALas24 + ingresosYEgresos,
            disponibles,
            diasEstada
        }
    };
}
export async function censoDiario({ organizacion, timestamp, unidadOrganizativa }) {
    try {
        const organizacionFound = await Organizacion.findById(organizacion);
        const ambito = 'internacion';
        const capa = organizacionFound?.usaEstadisticaV2 ? 'medica' : 'estadistica';


        if (!timestamp) {
            timestamp = moment();
        }

        const timestampStart = moment(timestamp).startOf('day');
        const timestampEnd = moment(timestamp).endOf('day');


        const snapshots = await CamasEstadosController.snapshotEstados(
            { fecha: timestampStart, organizacion, ambito, capa },
            {}
        );

        const movimientos = await CamasEstadosController.searchEstados(
            { desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa },
            {}
        );

        const snapshotsAgrupados = groupBy(snapshots, 'idInternacion');
        const snapshotsPorCama = groupBy(snapshots, 'idCama');
        const movimientosPorCama = groupBy(movimientos, 'idCama');
        const movimientosAgrupados = groupBy(movimientos, 'idInternacion');


        const internaciones = await unificarMovimientos(snapshotsAgrupados, movimientosAgrupados);

        const resultado = await realizarConteo(
            internaciones,
            unidadOrganizativa,
            timestampStart,
            timestampEnd,
            capa
        );

        const camas = await unificarMovimientos(snapshotsPorCama, movimientosPorCama);

        Object.keys(camas).forEach(idCama => {
            const ultimoMov = camas[idCama][camas[idCama].length - 1];


            const esDisponible =
                ultimoMov.estado !== 'bloqueada' &&
                ultimoMov.estado !== 'inactiva';

            const estaUnidadOrganizativa =
                String(ultimoMov.unidadOrganizativa.conceptId) === unidadOrganizativa;

            if (esDisponible && estaUnidadOrganizativa && ultimoMov.esCensable) {
                resultado.censo.disponibles++;
            } else {
            }
        });


        return resultado;

    } catch (err) {
        const dataErr = {
            fecha: timestamp,
            organizacion,
            unidadOrganizativa
        };
        await logger.error('censoDiario', dataErr, err, userScheduler);
        return null;
    }
}


function getInformesInternacion(data: any) {
    if (data?.informeIngreso || data?.informeEgreso) {


        return {
            informeIngreso: data.informeIngreso ?? null,
            informeEgreso: data.informeEgreso ?? null,
            periodosCensables: data.periodosCensables ?? []
        };
    }

    if (!data?.ejecucion?.registros) {

        return {
            informeIngreso: null,
            informeEgreso: null,
            periodosCensables: []
        };
    }


    const registros = data.ejecucion.registros;

    const egreso = registros.find(r => r.concepto?.conceptId === '58000006');
    const ingreso = registros.find(r => r.concepto?.conceptId === '721915006');

    return {
        informeIngreso: ingreso?.valor?.informeIngreso ?? null,
        informeEgreso: egreso?.valor?.InformeEgreso ?? null,
        periodosCensables: []
    };
}

export async function censoMensual({ organizacion, unidadOrganizativa, fechaDesde, fechaHasta }) {
    try {
        const resultado = [];
        const bucketsCensos: any = await Censo.find({
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            unidadOrganizativa,
            start: { $gte: moment(fechaDesde).startOf('month') },
            end: { $lte: moment(fechaHasta).endOf('month') }
        });

        for (const bucket of bucketsCensos) {
            const censos = bucket.censos.filter(censo => (
                moment(censo.fecha).isSameOrAfter(fechaDesde, 'day')
                && moment(censo.fecha).isSameOrBefore(fechaHasta, 'day')));
            resultado.push(...censos);
        }
        resultado.sort((a, b) => (a.fecha - b.fecha));
        return resultado;
    } catch (err) {
        const dataErr = {
            fechaDesde,
            fechaHasta,
            organizacion,
            unidadOrganizativa
        };
        await logger.error('censoMensual', dataErr, err, userScheduler);
        return null;
    }
}

export async function censoMensualJob(done) {
    try {
        const cantidadMeses = 1;

        const camasXOrg = await Camas.aggregate([
            { $group: { _id: '$organizacion._id' } }
        ]);

        const idsOrg = camasXOrg.map(a => a._id);

        const organizaciones: any = await Organizacion.find({
            _id: { $in: idsOrg }
        });

        const fechaDesde = moment().subtract(cantidadMeses, 'months').startOf('month');
        const fechahasta = moment();
        const dias = fechahasta.diff(fechaDesde, 'days');

        for (let i = dias; i > 0; i--) {
            const timestamp = moment().subtract(i, 'days');
            for (const organizacion of organizaciones) {
                for (const unidadOrganizativa of organizacion.unidadesOrganizativas) {
                    try {
                        const resultado: any = await censoDiario({
                            organizacion: organizacion._id,
                            timestamp,
                            unidadOrganizativa: unidadOrganizativa.conceptId
                        });
                        await storeCenso(
                            organizacion._id,
                            unidadOrganizativa.conceptId,
                            resultado.censo,
                            timestamp.startOf('day').toDate()
                        );
                    } catch (err) {
                        const dataErr = {
                            fecha: timestamp,
                            organizacion,
                            unidadOrganizativa
                        };
                        await logger.error('censoMensualLog', dataErr, err, userScheduler);
                    }
                }
            }
        }
    } catch (err) {
        await logger.error('censoMensualLog', err, userScheduler);
    }

    done();
}

export async function storeCenso(organizacion, unidadOrganizativa, censo, fecha) {
    try {
        fecha = moment(fecha).startOf('d').toDate();
        await Censo.update(
            {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                unidadOrganizativa,
                start: { $lte: fecha },
                end: { $gte: fecha }
            },
            {
                $pull: { censos: { fecha } },
            },
            {
                multi: true
            }
        );
        const dateStart = moment(fecha).startOf('month').toDate();
        const dateEnd = moment(fecha).endOf('month').toDate();
        return await Censo.update(
            {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                unidadOrganizativa,
                start: { $lte: fecha },
                end: { $gte: fecha }
            },
            {
                $push: { censos: { fecha, censo } },
                $setOnInsert: {
                    idOrganizacion: mongoose.Types.ObjectId(organizacion),
                    unidadOrganizativa,
                    start: dateStart,
                    end: dateEnd,
                }
            },
            {
                upsert: true
            }
        );
    } catch (err) {
        const dataErr = {
            organizacion,
            unidadOrganizativa,
            fecha
        };
        await logger.error('storeCenso', dataErr, err, userScheduler);
    }
}
