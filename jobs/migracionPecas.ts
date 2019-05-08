/**
 * Corre iterativamente el job de PECAS a partir de una fecha hasta ayer
 *
 * node jobs/migracionPecas.js [Js File to run]
*/

import * as config from './../config.private';
import { Connections } from './../connections';

import * as pecasCtrl from './../modules/estadistica/pecas/controller/agenda';
import * as moment from 'moment';

let fechaInicio = config.inicioMigracion;
let fechaFin = new Date(2018, 6, 15).setHours(0, 0, 0, 0);
Connections.initialize();

const done = () => {
    fechaInicio = moment(fechaInicio).add(1, 'day').toDate();
    console.log('fechaInicio ', fechaInicio);
    if (fechaInicio < new Date(fechaFin)) {
        run(fechaInicio);
    } else {
        process.exit(0);
    }

};

function run(fecha) {
    console.log('run', fecha, fechaFin);
    if (fecha < fechaFin) {
        let start = moment(fecha.setHours(0, 0, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
        let end = moment(fecha.setHours(23, 59, 0, 0)).subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');
        pecasCtrl.consultaPecas(done, start, end);
    }
}

run(fechaInicio);
