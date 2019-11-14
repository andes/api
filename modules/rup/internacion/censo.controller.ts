import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { model as Prestaciones } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';
const groupBy = (xs: any[], key: string) => {
    return xs.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

async function mergeDatos(snapshots, movimientos) {
    let internaciones = [...new Set([...Object.keys(snapshots).filter(snap => snap !== 'null'), ...Object.keys(movimientos).filter(mov => mov !== 'null')])];
    const mapping = {};
    internaciones.forEach(inter => {
        if (snapshots[inter] && movimientos[inter]) {
            mapping[inter] = [...snapshots[inter], ...movimientos[inter]];
        } else if (snapshots[inter]) {
            mapping[inter] = snapshots[inter];
        } else if (movimientos[inter]) {
            mapping[inter] = movimientos[inter];
        }

        mapping[inter].sort((a, b) => (a.fecha - b.fecha));
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
    let disponibles = 0;

    let tablaPacientes = {};

    const ps = Object.keys(internaciones).map(async idInter => {
        const allMovimientos = internaciones[idInter];
        const ultimoMovimiento = allMovimientos[allMovimientos.length - 1];
        const prestacion = prestaciones.find(p => String(p.id) === String(ultimoMovimiento.idInternacion));
        const informesInternacion: any = await getInformesInternacion(prestacion);
        const fechaEgreso = informesInternacion.egreso.fechaEgreso;
        const fechaIngreso = informesInternacion.ingreso.fechaIngreso;

        if (!tablaPacientes[ultimoMovimiento.paciente._id]) {
            const cama = camas[String(ultimoMovimiento.idCama)][0];
            tablaPacientes[ultimoMovimiento.paciente._id] = {
                datos: {
                    paciente: ultimoMovimiento.paciente,
                    cama: {
                        nombre: cama.nombre,
                        tipoCama: cama.tipoCama,
                        sectores: cama.sectores
                    },
                },
                actividad: []
            };
        }

        if (moment(fechaIngreso).isBefore(timestampStart.toDate())) {
            existenciaALas0++;
            tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                ingreso: null,
                paseDe: null,
                egreso: null,
                paseA: null,
            });
        } else if (moment(fechaIngreso).isSameOrAfter(timestampStart.toDate())) {
            ingresos++;
            tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                ingreso: 'SI',
            });
        }

        if (moment(fechaEgreso).isSame(fechaIngreso, 'day')) {
            ingresosYEgresos++;
            tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                ingreso: 'SI',
                egreso: informesInternacion.egreso.tipoEgreso.id,
            });
        }

        if (moment(fechaEgreso).isSameOrBefore(timestampEnd.toDate())) {
            if (informesInternacion.egreso.tipoEgreso.id === 'Defuncion') {
                defunciones++;
            } else {
                altas++;
            }
            tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                egreso: informesInternacion.egreso.tipoEgreso.id,
            });
        }

        let movimientoAnterior;
        for (const movimiento of allMovimientos) {
            if (movimientoAnterior && String(movimientoAnterior.unidadOrganizativa._id) !== String(movimiento.unidadOrganizativa.id)) {
                if (String(movimientoAnterior.unidadOrganizativa._id) !== unidadOrganizativa) {
                    pasesDe++;
                    tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                        paseDe: 'SI',
                    });
                } else {
                    pasesA++;
                    tablaPacientes[ultimoMovimiento.paciente._id].actividad.push({
                        paseA: 'SI',
                    });
                }
            }

            movimientoAnterior = movimiento;
        }
    });

    await Promise.all(ps);

    existenciaALas24 = existenciaALas0 + ingresos - altas - defunciones;

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
            disponibles
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
    const snapshotsUO = snapshots.filter(item => String(item.unidadOrganizativa._id) === unidadOrganizativa);
    const movimientos = await CamasEstadosController.searchEstados({ desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa }, {});

    const snapshotsAgrupados = groupBy(snapshotsUO, 'idInternacion');
    const snapshotsPorCama = groupBy(snapshots, 'idCama');
    const movimientosAgrupados = groupBy(movimientos, 'idInternacion');

    const internaciones = await mergeDatos(snapshotsAgrupados, movimientosAgrupados);


    const resultado = await realizarConteo(internaciones, unidadOrganizativa, timestampStart, timestampEnd, snapshotsPorCama);

    return resultado;
}

async function getInformesInternacion(prestacion) {
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
