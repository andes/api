let schedule = require('node-schedule');
import * as moment from 'moment';
import * as farmacias from './modules/mobileApp/controller/FarmaciasTurnosDownloader';
import * as recordatorioCtrl from './modules/mobileApp/controller/RecordatorioController';

export class Scheduler {

    static initialize() {

        /**
         * Descargar Farmacias de Turnos
         */
        schedule.scheduleJob('0 3 10,20 * *', function () {
            let start = moment(new Date()).add(1, 'months').startOf('month').format('YYYY-MM-DD');
            let end = moment(new Date()).add(1, 'months').endOf('month').format('YYYY-MM-DD');
            farmacias.donwloadData(start, end);
        });

        /**
         * Enviar recordatorios de turnos a pacientes
         */

        schedule.scheduleJob('0 18 * * *', function () {
            recordatorioCtrl.buscarTurnosARecordar(1).then(() => {
                recordatorioCtrl.enviarTurnoRecordatorio();
            });
        });

        /**
         * Enviar recordatorios de agendas
         */

        schedule.scheduleJob('30 18 * * *', function () {
            recordatorioCtrl.recordarAgenda().then(() => {
                recordatorioCtrl.enviarAgendaNotificacion();
            });
        });

    }

}
