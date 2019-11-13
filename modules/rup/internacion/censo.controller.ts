const mongoose = require('mongoose');
import moment = require('moment');
import { model as Prestaciones } from '../schemas/prestacion';
import * as CamasEstadosController from './cama-estados.controller';

export async function censoDiario({ organizacion, timestamp, unidadOrganizativa }) {
    const ambito = 'internacion';
    const capa = 'estadistica';

    if (!timestamp) {
        timestamp = moment();
    }

    const timestampStart = moment(timestamp).startOf('day');
    const timestampEnd = moment(timestamp).endOf('day');

    let estadosCamas = await CamasEstadosController.snapshotEstados({ fecha: timestampStart, organizacion, ambito, capa }, {});

    estadosCamas = estadosCamas.filter(item => String(item.unidadOrganizativa._id) === unidadOrganizativa);

    let existenciaALas0 = 0;
    let ingresos = 0;
    let pasesDe = 0;
    let altas = 0;
    let defunciones = 0;
    let pasesA = 0;
    let ingresosYEgresos = 0;
    let pacientesDia = 0;
    let disponibles = 0;

    let allMovimientos = await CamasEstadosController.searchEstados({ desde: timestampStart, hasta: timestampEnd, organizacion, ambito, capa }, {});


    let groupBy = (xs, key) => {
        return xs.reduce((rv, x) => {
            (rv[x[key]] = rv[x[key]] || []).push(x);
            return rv;
        }, {});
    };

    const movimientosAgrupadosInternacion = groupBy(allMovimientos, 'idInternacion');

    Object.keys(movimientosAgrupadosInternacion).forEach(v => {
        movimientosAgrupadosInternacion[v] = movimientosAgrupadosInternacion[v].sort((a, b) => a.fecha - b.fecha);
    });

    const idsPrestacion = [];
    for (const estadoCama of estadosCamas) {
        if (estadoCama.estado === 'ocupada') {
            existenciaALas0++;
            idsPrestacion.push(estadoCama.idInternacion);
        }
        if (estadoCama.estado !== 'inactiva') {
            disponibles++;
        }
    }

    Object.keys(movimientosAgrupadosInternacion).filter(mov => mov !== 'null').map(async idInter => {
        idsPrestacion.push(mongoose.Types.ObjectId(idInter));
    });

    console.log(idsPrestacion);

    const prestaciones = await Prestaciones.find({ _id: { $in: idsPrestacion.map(mongoose.Types.ObjectId) } });

    const ps = idsPrestacion.map(async idInter => {
        const prestacion = prestaciones.find(p => String(p.id) === String(idInter));
        if (prestacion) {
            const informesPrestacion: any = await getInformesInternacion(prestacion);
            const ingreso = informesPrestacion.ingreso;
            const egreso = informesPrestacion.egreso;

            if (moment(ingreso.fechaIngreso).isSame(egreso.fechaEgreso, 'day')) {
                ingresos++;
                ingresosYEgresos++;
                if (egreso.tipoEgreso.id === 'Defunción') {
                    defunciones++;
                } else {
                    altas++;
                }
            } else if (moment(ingreso.fechaIngreso).isSame(timestamp, 'day')) {
                ingresos++;
            } else if (moment(egreso.fechaEgreso).isSame(timestamp, 'day')) {
                if (egreso.tipoEgreso.id === 'Defunción') {
                    defunciones++;
                } else {
                    altas++;
                }
            }

            if (egreso.UnidadOrganizativaDestino) {
                if (String(egreso.UnidadOrganizativaDestino._id) === unidadOrganizativa) {
                    pasesDe++;
                    ingresos++;
                } else if (String(egreso.UnidadOrganizativaDestino._id) !== unidadOrganizativa) {
                    pasesA++;
                }
            }
        }
    });

    await Promise.all(ps);

    let resultado = {
        existenciaALas0,
        ingresos,
        defunciones,
        altas,
        ingresosYEgresos,
        existenciaALas24: existenciaALas0 + ingresos - altas - defunciones,
        pacientesDia: existenciaALas0 + ingresos,
        disponibles
    };

    console.log(resultado);
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
