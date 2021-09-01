/**
 * Corre iterativamente el job de PECAS a partir de una fecha hasta ayer
 *
 * node jobs/migracionPecas.js [Js File to run]
*/

import * as config from './../config.private';
import { Connections } from './../connections';

import * as pecasCtrl from './../modules/estadistica/pecas/controller/agenda';
import * as fueraAgendaCtrl from './../modules/estadistica/pecas/controller/fueraDeAgenda';

import * as moment from 'moment';

let fechaInicio = new Date(2019, 5, 4);
const fechaFin = new Date(2019, 5, 5).setHours(0, 0, 0, 0);
Connections.initialize();

const done = () => {
    fechaInicio = moment(fechaInicio).add(1, 'day').toDate();
    if (fechaInicio < new Date(fechaFin)) {
        run(fechaInicio);
    } else {
        process.exit(0);
    }

};

function run(fecha) {
    if (fecha <= new Date(fechaFin)) {
        const start = moment(fecha.setHours(0, 0, 0, 0)).format('YYYY-MM-DD HH:mm:ss');
        const end = moment(fecha.setHours(23, 59, 0, 0)).format('YYYY-MM-DD HH:mm:ss');

        pecasCtrl.consultaPecas(done, start, end);
        // fueraAgendaCtrl.fueraAgendaPecas(start, end, done);
    }
}

run(fechaInicio);
