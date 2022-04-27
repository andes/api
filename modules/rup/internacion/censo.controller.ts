import * as moment from 'moment';
import * as mongoose from 'mongoose';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Prestacion } from '../schemas/prestacion';
import { InternacionResumen } from './resumen/internacion-resumen.schema';
import * as CamasEstadosController from './cama-estados.controller';
import { Camas } from './camas.schema';
import { Censo } from './censos.schema';

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
        if (snapshots[idInternacion] && movimientos[idInternacion]) {
            mapping[idInternacion] = [...snapshots[idInternacion], ...movimientos[idInternacion]];
        } else if (snapshots[idInternacion]) {
            mapping[idInternacion] = snapshots[idInternacion];
        } else if (movimientos[idInternacion]) {
            mapping[idInternacion] = movimientos[idInternacion];
        }

        mapping[idInternacion].sort((a, b) => (a.fecha - b.fecha));
    });

    return mapping;
}

async function realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, capa) {
    let prestaciones;
    let resumenPrestacionMap: any = [];
    if (capa === 'medica') {// solo para efectores -> estadistica-v2
        const condicion1 = { _id: { $in: [...Object.keys(internaciones)] } };// busca resumen de internacion por id.
        const condicion2 = { idPrestacion: { $exists: true } };// que exista idPrestacion.
        const resumenes = await InternacionResumen.find({ $and: [condicion1, condicion2] });
        resumenPrestacionMap = resumenes.map(r => { return { idPrestacion: r.idPrestacion, idResumen: r.id }; });
        prestaciones = await Prestacion.find({ _id: { $in: resumenPrestacionMap.map(r => r.idPrestacion) } });
    } else {
        prestaciones = await Prestacion.find({ _id: { $in: [...Object.keys(internaciones)] } });
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
        if (capa === 'medica') {
            const idPrestacion = resumenPrestacionMap.find(r => String(r.idResumen) === String(allMovimientos[0].idInternacion))?.idPrestacion;
            prestacion = prestaciones.find(p => String(p.id) === String(idPrestacion));

        } else {
            prestacion = prestaciones.find(p => String(p.id) === String(allMovimientos[0].idInternacion));
        }


        if (prestacion) {
            const informesInternacion: any = getInformesInternacion(prestacion);
            const desde = informesInternacion.ingreso.fechaIngreso;

            dataInternaciones[idInter] = {};
            dataInternaciones[idInter]['informesInternacion'] = informesInternacion;
            if (ultimoMovimientoUO) {
                // obtengo movimientos desde la fecha de ingreso hasta el día del censo
                const estadosInter = await CamasEstadosController.searchEstados({ desde, hasta: timestampEnd, organizacion, ambito, capa }, filtros);

                const movimientosUO = estadosInter.filter(e => e.unidadOrganizativa.conceptId === unidadOrganizativa);
                // verificamos si hubo cambios de UO
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
                dataInternaciones[idInter]['prestacion'] = prestacion;
                dataInternaciones[idInter]['esPaseA'] = esPaseA;
            }
        }
    }

    idInternaciones.map(async idInter => {
        const allMovimientos = dataInternaciones[idInter]['allMovimientos'];
        if (!internaciones || !allMovimientos) {
            return;
        }

        const ultimoMovimiento = allMovimientos[allMovimientos.length - 1];
        // ultimo movimiento en la unidad organizativa que se está filtrando
        const ultimoMovimientoUO = dataInternaciones[idInter]['ultimoMovimientoUO'];
        const prestacion = dataInternaciones[idInter]['prestacion'];
        const indiceCama = arrayCamas.findIndex(x => x.toString() === ultimoMovimiento.idCama.toString());
        if (!prestacion) {
            return;
        } else if (prestacion.ejecucion.registros[0].esCensable && indiceCama === -1) {
            arrayCamas.push(ultimoMovimiento.idCama);
            disponibles ++;
        }
        const esPaseA = dataInternaciones[idInter]['esPaseA'];
        const informesInternacion = dataInternaciones[idInter]['informesInternacion'];
        const fechaEgreso = informesInternacion.egreso ? informesInternacion.egreso.fechaEgreso : null;
        const fechaIngreso = informesInternacion.ingreso.fechaIngreso;
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

        const prestacionInternacion = (prestacion as any).ejecucion.registros[0];
        /** Ignoramos las internaciones de cama no censable que no estén explicitamente flageadas 'esCensable' en true */
        if (!ultimoMovimiento.esCensable && !prestacionInternacion.esCensable) {
            return;
        }

        /** Ignoramos las internaciones de cama censable que estan explicitamente flageadas 'esCensable' en false */
        const prestacionNoCensable = 'esCensable' in prestacionInternacion && prestacionInternacion.esCensable === false;
        if (ultimoMovimiento.esCensable && prestacionNoCensable) {
            return;
        }
        if (fechaEgreso) {
            if ((primerUO === unidadOrganizativa) && (ultimaUO === unidadOrganizativa)) {
                if (moment(fechaEgreso).isSame(fechaIngreso, 'day')) {
                    ingresosYEgresos++;
                    ingresoEgresoCargado = true;
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                        ingreso: 'SI',
                        fechaIngreso,
                        egreso: informesInternacion.egreso.tipoEgreso.id,
                        diasEstada: diasEstadaUO
                    });
                }
            }
            if (ultimaUO === String(unidadOrganizativa)) {
                if (egresaDiaCenso) {
                    if (informesInternacion.egreso.tipoEgreso.id === 'Defunción') {
                        defunciones++;
                    } else {
                        altas++;
                    }
                    if (!ingresoEgresoCargado) {
                        checkPaciente(ultimoMovimiento);
                        tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                            fechaIngreso,
                            egreso: informesInternacion.egreso.tipoEgreso.id,
                            diasEstada: diasEstadaUO
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
                    diasEstada: diasEstadaUO || null
                });
            } else if (moment(fechaIngreso).isSameOrAfter(timestampStart.toDate())) {
                ingresos++;
                if (!ingresoEgresoCargado) {
                    checkPaciente(ultimoMovimientoUO);
                    tablaPacientes[ultimoMovimientoUO.paciente.id].actividad.push({
                        ingreso: 'SI',
                        fechaIngreso,
                        diasEstada: diasEstadaUO || null
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
                        diasEstada: null
                    });
                } else {
                    if (movimientoAnterior.unidadOrganizativa.conceptId === unidadOrganizativa && movimiento.unidadOrganizativa.conceptId !== unidadOrganizativa) {
                        pasesA++;
                        checkPaciente(movimientoAnterior);
                        tablaPacientes[movimiento.paciente.id].actividad.push({
                            paseA: movimiento.unidadOrganizativa.term,
                            fechaIngreso,
                            diasEstada: diasEstadaUO
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

/**
 * Genera el censo diario para una organizacion, unidad organizativa, y fecha dada
 */
export async function censoDiario({ organizacion, timestamp, unidadOrganizativa }) {
    const organizacionFound = await Organizacion.findById(organizacion);
    const ambito = 'internacion';
    const capa = organizacionFound?.usaEstadisticaV2 ? 'medica' : 'estadistica';
    if (!timestamp) {
        timestamp = moment();
    }

    const timestampStart = moment(timestamp).startOf('day');
    const timestampEnd = moment(timestamp).endOf('day');

    const snapshots = await CamasEstadosController.snapshotEstados({ fecha: timestampStart, organizacion, ambito, capa }, {});


    const movimientos = await CamasEstadosController.searchEstados({ desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa }, {});

    const snapshotsAgrupados = groupBy(snapshots, 'idInternacion');
    const snapshotsPorCama = groupBy(snapshots, 'idCama');
    const movimientosPorCama = groupBy(movimientos, 'idCama');
    const movimientosAgrupados = groupBy(movimientos, 'idInternacion');
    const internaciones = await unificarMovimientos(snapshotsAgrupados, movimientosAgrupados);
    const resultado = await realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, capa);

    const camas = await unificarMovimientos(snapshotsPorCama, movimientosPorCama);
    Object.keys(camas).forEach(idCama => {
        const ultimoMov = camas[idCama][camas[idCama].length - 1];
        const esDisponible = (ultimoMov.estado !== 'bloqueada' && ultimoMov.estado !== 'inactiva');
        const estaUnidadOrganizativa = String(ultimoMov.unidadOrganizativa.conceptId) === unidadOrganizativa;
        if (esDisponible && estaUnidadOrganizativa && ultimoMov.esCensable) {
            resultado.censo.disponibles++;
        }
    });

    return resultado;
}

function getInformesInternacion(prestacion) {
    const registros = prestacion.ejecucion.registros;
    const egresoExiste = registros.find(registro => registro.concepto.conceptId === '58000006');
    const ingresoExiste = registros.find(registro => registro.concepto.conceptId === '721915006');
    const response = {};
    if (egresoExiste) {
        response['egreso'] = egresoExiste.valor.InformeEgreso;
    }
    if (ingresoExiste) {
        response['ingreso'] = ingresoExiste.valor.informeIngreso;
    }
    return response;
}

export async function censoMensual({ organizacion, unidadOrganizativa, fechaDesde, fechaHasta }) {
    const resultado = [];
    const bucketsCensos: any = await Censo.find({
        idOrganizacion: mongoose.Types.ObjectId(organizacion),
        unidadOrganizativa,
        start: { $gte: moment(fechaDesde).startOf('month') },
        end: { $lte: moment(fechaHasta).endOf('month') }
    });

    for (const bucket of bucketsCensos) {
        const censos = bucket.censos.filter(censo =>
            (moment(censo.fecha).isSameOrAfter(fechaDesde, 'day')
            && moment(censo.fecha).isSameOrBefore(fechaHasta, 'day')));
        resultado.push(...censos);
    }
    resultado.sort((a, b) => (a.fecha - b.fecha));
    return resultado;
}

export async function censoMensualJob(done) {
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
            }
        }
    }

    done();
}

export async function storeCenso(organizacion, unidadOrganizativa, censo, fecha) {
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
}
