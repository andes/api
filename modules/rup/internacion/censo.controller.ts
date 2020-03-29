import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestaciones } from '../schemas/prestacion';
import { Camas } from './camas.schema';
import { Censos } from './censos.schema';
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
    const idInternacionesUnicos = [...new Set([...Object.keys(snapshots).filter(snap => snap !== 'null'), ...Object.keys(movimientos).filter(mov => mov !== 'null')])];
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

    let tablaPacientes = {};

    Object.keys(internaciones).map(async idInter => {
        const allMovimientos = internaciones[idInter];
        const ultimoMovimiento = allMovimientos[allMovimientos.length - 1];
        const prestacion = prestaciones.find(p => String(p.id) === String(ultimoMovimiento.idInternacion));
        const informesInternacion: any = getInformesInternacion(prestacion);
        const fechaEgreso = informesInternacion.egreso ? informesInternacion.egreso.fechaEgreso : null;
        const fechaIngreso = informesInternacion.ingreso.fechaIngreso;
        const primerUO = String(allMovimientos[0].unidadOrganizativa._id);
        const ultimaUO = String(ultimoMovimiento.unidadOrganizativa._id);

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

        if (fechaEgreso) {
            if ((primerUO === String(unidadOrganizativa)) && (ultimaUO === String(unidadOrganizativa))) {
                if (moment(fechaEgreso).isSame(fechaIngreso, 'day')) {
                    ingresosYEgresos++;
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                        ingreso: 'SI',
                        egreso: informesInternacion.egreso.tipoEgreso.id,
                    });
                }
            }
            if (ultimaUO === String(unidadOrganizativa)) {
                if (moment(fechaEgreso).isSameOrBefore(timestampEnd.toDate())) {
                    if (informesInternacion.egreso.tipoEgreso.id === 'Defuncion') {
                        defunciones++;
                    } else {
                        altas++;
                    }
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                        egreso: informesInternacion.egreso.tipoEgreso.id,
                    });
                }
            }
        }

        if (primerUO === String(unidadOrganizativa)) {
            if (moment(fechaIngreso).isBefore(timestampStart.toDate())) {
                existenciaALas0++;
                checkPaciente(ultimoMovimiento);
                tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                    ingreso: null,
                    paseDe: null,
                    egreso: null,
                    paseA: null,
                });
            } else if (moment(fechaIngreso).isSameOrAfter(timestampStart.toDate())) {
                ingresos++;
                checkPaciente(ultimoMovimiento);
                tablaPacientes[ultimoMovimiento.paciente.id].actividad.push({
                    ingreso: 'SI',
                });
            }
        }


        let movimientoAnterior;
        for (const movimiento of allMovimientos) {
            if (movimientoAnterior && String(movimientoAnterior.unidadOrganizativa._id) !== String(movimiento.unidadOrganizativa._id)) {
                if (String(movimientoAnterior.unidadOrganizativa._id) !== unidadOrganizativa) {
                    pasesDe++;
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[movimiento.paciente.id].actividad.push({
                        paseDe: 'SI',
                    });
                } else {
                    pasesA++;
                    checkPaciente(ultimoMovimiento);
                    tablaPacientes[movimiento.paciente.id].actividad.push({
                        paseA: 'SI',
                    });
                }
            }

            movimientoAnterior = movimiento;
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
            disponibles: 0
        }
    };
}

export async function censoDiario({ organizacion, timestamp, unidadOrganizativa }) {
    const ambito = 'internacion';
    const capa = 'estadistica';
    if (!timestamp) {
        timestamp = moment();
    }

    const timestampStart = moment(timestamp).startOf('day');
    const timestampEnd = moment(timestamp).endOf('day');

    const snapshots = await CamasEstadosController.snapshotEstados({ fecha: timestampStart, organizacion, ambito, capa }, {});

    // const snapshotsUO = snapshots.filter(item => String(item.unidadOrganizativa._id) === unidadOrganizativa);

    const movimientos = await CamasEstadosController.searchEstados({ desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa }, {});

    const snapshotsAgrupados = groupBy(snapshots, 'idInternacion');
    const snapshotsPorCama = groupBy(snapshots, 'idCama');
    const movimientosPorCama = groupBy(movimientos, 'idCama');
    const movimientosAgrupados = groupBy(movimientos, 'idInternacion');

    const internaciones = await unificarMovimientos(snapshotsAgrupados, movimientosAgrupados);

    const resultado = await realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, snapshotsPorCama);

    const camas = await unificarMovimientos(snapshotsPorCama, movimientosPorCama);

    let camasDisponibles = 0;
    Object.keys(camas).map(idCama => {
        const ultimoMov = camas[idCama][camas[idCama].length - 1];
        const esDisponible = ultimoMov.estado === 'disponible';
        const estaUnidadOrganizativa = String(ultimoMov.unidadOrganizativa._id) === unidadOrganizativa;
        if (esDisponible && estaUnidadOrganizativa) {
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
    const bucketsCensos: any = await Censos.find({
        idOrganizacion: mongoose.Types.ObjectId(organizacion),
        'unidadOrganizativa.conceptId': unidadOrganizativa,
        start: { $gte: moment(fechaDesde).startOf('month') },
        end: { $lte: moment(fechaHasta).endOf('month') }
    });

    for (const bucket of bucketsCensos) {
        const censos = bucket.censos.filter(censo =>
            (moment(censo.fecha).isSameOrAfter(fechaDesde, 'day')
                && moment(censo.fecha).isSameOrBefore(fechaHasta, 'day')));
        resultado.push(...censos);
    }

    return resultado;
}

export async function censoMensualJob(done) {
    let cantidadMeses = 1;

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
                const resultado: any = await censoDiario({ organizacion: organizacion._id, timestamp, unidadOrganizativa: unidadOrganizativa._id });

                const nuevoCenso = {
                    fecha: timestamp.startOf('day').toDate(),
                    censo: resultado.censo
                };

                await store({ organizacion: organizacion._id, unidadOrganizativa }, nuevoCenso);
            }
        }
    }

    done();
}

export async function store({ organizacion, unidadOrganizativa }, censo) {
    await Censos.update(
        {
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            'unidadOrganizativa.conceptId': unidadOrganizativa.conceptId,
            start: { $lte: censo.fecha },
            end: { $gte: censo.fecha }
        },
        {
            $pull: { censos: { fecha: censo.fecha } },
        },
        {
            multi: true
        }
    );

    return await Censos.update(
        {
            idOrganizacion: mongoose.Types.ObjectId(organizacion),
            'unidadOrganizativa.conceptId': unidadOrganizativa.conceptId,
            start: { $lte: censo.fecha },
            end: { $gte: censo.fecha }
        },
        {
            $push: { censos: censo },
            $setOnInsert: {
                idOrganizacion: mongoose.Types.ObjectId(organizacion),
                unidadOrganizativa,
                start: moment(censo.fecha).startOf('month').toDate(),
                end: moment(censo.fecha).endOf('month').toDate(),
            }
        },
        {
            upsert: true
        }
    );
}
