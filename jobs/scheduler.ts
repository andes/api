let schedule = require('node-schedule');
import * as moment from 'moment';
import * as farmacias from './../modules/mobileApp/controller/FarmaciasTurnosDownloader';
import * as recordatorioCtrl from './../modules/mobileApp/controller/RecordatorioController';
import * as agendaCtrl from './../modules/turnos/controller/agenda';
import { Connections } from './../connections';
class Scheduler {

    static initialize() {

        Connections.initialize();
        /**
         * Descargar Farmacias de Turnos
         */
        schedule.scheduleJob('0 3 10,20 * *', function () {
            let start = moment(new Date()).add(1, 'months').startOf('month').format('YYYY-MM-DD');
            let end = moment(new Date()).add(1, 'months').endOf('month').format('YYYY-MM-DD');
            console.log('Running farmacias de turnos Jobs ' + start + ' ' + end);
            farmacias.donwloadData(start, end);
        });

        /**
         * Enviar recordatorios de turnos a pacientes
         */

        schedule.scheduleJob('0 18 * * *', function () {
            console.log('Running recordatorio turnos pacientes Jobs ');
            recordatorioCtrl.buscarTurnosARecordar(1).then(() => {
                recordatorioCtrl.enviarTurnoRecordatorio();
            });
        });

        /**
         * Enviar recordatorios de agendas
         */

        schedule.scheduleJob('30 18 * * *', function () {
            console.log('Running recordatorio agendas Jobs ');
            recordatorioCtrl.recordarAgenda().then(() => {
                recordatorioCtrl.enviarAgendaNotificacion();
            });
        });

        schedule.scheduleJob('0 23 * * *', function () {
            console.log('Running Update Agenda');
            agendaCtrl.actualizarAgendas();
        });

    }

};


Scheduler.initialize();
