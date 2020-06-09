import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestaciones } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { Censo } from './censos.schema';
import * as CamasEstadosController from './cama-estados.controller';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

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

async function realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, camas) {
    const prestaciones = await Prestaciones.find({ _id: { $in: [...Object.keys(internaciones)] } });

    let existenciaALas0 = 0;
    let existenciaALas24 = 0;
    let ingresos = 0;
    let pasesDe = 0;
    let altas = 0;
    let defunciones = 0;
    let pasesA = 0;
    let ingresosYEgresos = 0;
    let diasEstada = 0;

    let tablaPacientes = {};

    Object.keys(internaciones).map(async idInter => {
        const allMovimientos = internaciones[idInter];
        const ultimoMovimiento = allMovimientos[allMovimientos.length - 1];
        // ultimo movimiento en la unidad organizativa que se esta filtrando
        const ultimoMovimientoUO = allMovimientos.slice().reverse().find(m => m.unidadOrganizativa.conceptId === unidadOrganizativa);
        const prestacion = prestaciones.find(p => String(p.id) === String(ultimoMovimiento.idInternacion));
        const informesInternacion: any = getInformesInternacion(prestacion);
        const fechaEgreso = informesInternacion.egreso ? informesInternacion.egreso.fechaEgreso : null;
        const fechaIngreso = informesInternacion.ingreso.fechaIngreso;
        const primerUO = allMovimientos[0].unidadOrganizativa.conceptId;
        const ultimaUO = ultimoMovimiento.unidadOrganizativa.conceptId;
        let ingresoEgresoCargado = false;

        function checkPaciente(movimiento) {
            if (!tablaPacientes[movimiento.paciente.id]) {
                const cama = camas[String(movimiento.idCama)][0];
                tablaPacientes[movimiento.paciente.id] = {
                    datos: {
                        paciente: movimiento.paciente,
                        cama: {
                            nombre: cama.nombre,
                            tipoCama: cama.tipoCama,
                            sectores: cama.sectores
                        },
                    },
                    actividad: []
                };
            }
        }

        if (ultimoMovimiento.esCensable) {
            if (fechaEgreso) {
                if ((primerUO === unidadOrganizativa) && (ultimaUO === unidadOrganizativa)) {
                    if (moment(fechaEgreso).isSame(fechaIngreso, 'day')) {
                        ingresosYEgresos++;
                        ingresoEgresoCargado = true;
                        checkPaciente(ultimoMovimiento);
                        tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                            ingreso: 'SI',
                            egreso: informesInternacion.egreso.tipoEgreso.id,
                        });
                    }
                }
                if (ultimaUO === String(unidadOrganizativa)) {
                    if (moment(fechaEgreso).isSameOrBefore(timestampEnd.toDate())) {
                        diasEstada += informesInternacion.egreso.diasDeEstada;
                        if (informesInternacion.egreso.tipoEgreso.id === 'Defunción') {
                            defunciones++;
                        } else {
                            altas++;
                        }
                        if (!ingresoEgresoCargado) {
                            checkPaciente(ultimoMovimiento);
                            tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                                egreso: informesInternacion.egreso.tipoEgreso.id,
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
                        paseDe: null,
                        egreso: null,
                        paseA: null,
                    });
                } else if (moment(fechaIngreso).isSameOrAfter(timestampStart.toDate())) {
                    ingresos++;
                    if (!ingresoEgresoCargado) {
                        checkPaciente(ultimoMovimientoUO);
                        tablaPacientes[ultimoMovimientoUO.paciente.id].actividad.push({
                            ingreso: 'SI',
                        });
                    }
                }
            }

            let movimientoAnterior;
            for (const movimiento of allMovimientos) {
                if (movimientoAnterior && movimientoAnterior.unidadOrganizativa.conceptId !== movimiento.unidadOrganizativa.conceptId) {
                    if (movimientoAnterior.unidadOrganizativa.conceptId !== unidadOrganizativa) {
                        pasesDe++;
                        checkPaciente(movimiento);
                        tablaPacientes[movimiento.paciente.id].actividad.push({
                            paseDe: movimientoAnterior.unidadOrganizativa.term
                        });
                    } else {
                        pasesA++;
                        checkPaciente(movimientoAnterior);
                        tablaPacientes[movimiento.paciente.id].actividad.push({
                            paseA: movimiento.unidadOrganizativa.term
                        });
                    }
                }

                movimientoAnterior = movimiento;
            }
        }
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
            disponibles: 0,
            diasEstada
        }
    };
}

/**
 * Genera el censo diario para una organizacion, unidad organizativa, y fecha dada
 */
export async function censoDiario({ organizacion, timestamp, unidadOrganizativa }) {
    const ambito = 'internacion';
    const capa = 'estadistica';
    if (!timestamp) {
        timestamp = moment();
    }

    const timestampStart = moment(timestamp).startOf('day');
    const timestampEnd = moment(timestamp).endOf('day');

    const snapshots = await CamasEstadosController.snapshotEstados({ fecha: timestampStart, organizacion, ambito, capa }, {});

    // const snapshotsUO = snapshots.filter(item => String(item.unidadOrganizativa.conceptId) === unidadOrganizativa);

    const movimientos = await CamasEstadosController.searchEstados({ desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa }, {});


    const snapshotsAgrupados = groupBy(snapshots, 'idInternacion');
    const snapshotsPorCama = groupBy(snapshots, 'idCama');
    const movimientosPorCama = groupBy(movimientos, 'idCama');
    const movimientosAgrupados = groupBy(movimientos, 'idInternacion');
    const internaciones = await unificarMovimientos(snapshotsAgrupados, movimientosAgrupados);
    const resultado = await realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, snapshotsPorCama);

    const camas = await unificarMovimientos(snapshotsPorCama, movimientosPorCama);

    let camasDisponibles = 0;
    Object.keys(camas).forEach(idCama => {
        const ultimoMov = camas[idCama][camas[idCama].length - 1];
        const esDisponible = (ultimoMov.estado !== 'bloqueada' && ultimoMov.estado !== 'inactiva');
        const estaUnidadOrganizativa = String(ultimoMov.unidadOrganizativa.conceptId) === unidadOrganizativa;
        if (esDisponible && estaUnidadOrganizativa && ultimoMov.esCensable) {
            camasDisponibles++;
        }
    });


    resultado.censo.disponibles = camasDisponibles;

    return resultado;
}

function getInformesInternacion(prestacion) {
    let registros = prestacion.ejecucion.registros;
    let egresoExiste = registros.find(registro => registro.concepto.conceptId === '58000006');
    let ingresoExiste = registros.find(registro => registro.concepto.conceptId === '721915006');
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
