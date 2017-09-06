let schedule = require('node-schedule');
import { Connections } from './../connections';
import { jobs } from '../config.private';

class Scheduler {

    static initialize() {

        /**
         *
         * Cada tarea tiene que exportar una función que se ejecuta
         * cuando se da el tiempo indicado
         *
         */

        jobs.forEach(job => {
            let action = require('../' + job.action);
            schedule.scheduleJob(job.when, function () {
                action();
            });
        });

    }

}

Connections.initialize();

Scheduler.initialize();
