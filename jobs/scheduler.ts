import { ChildProcess, spawn } from 'child_process';
import * as debug from 'debug';
import { jobs } from '../config.private';


const schedule = require('node-schedule');
const log = debug('jobs');
const defaultTimeout = 1000 * 60 * 10; // default 10 minutes

/**
 * JOB Configuration para config.private
 *
 * @param {string} when  CRON string que decide cuando se ejecuta cada instancia del job
 * @param {string} action PATH del archivo a ejecutar
 * @param {boolean} concurrent Indica si se puede ejecutar varias instancias del mismo proceso.
 * @param {Number} timeout Tiempo en milisegundos para cerrar un jobs si no termina. Default: 10 minutos.
 *
 *
 * Cada archivo JOB debe tener una estructura como esta:
 *
 * function run(done) {
 *   dosameStaff();
 *   done();
 * }
 *
 * export = run;
 *
 * Exportan una función que recibe un callback para determinar cuando termina el proceso. Inmediatamente la función 'done'
 * es llamada el proceso es finalizado, por lo que todas las operaciones de escritura deben haber finalizado.
 * No deben realizar conexión a mongo debido a que las conexiones ya son inicializadas en el contexto de su ejecución.
 *
 * SCHEDULER
 *
 * El scheduler toma como parametros los JOBS indicados en el config.private.
 * Cada tarea define su especificación de cuando debe ejecutarse mediante el formato CRON. Cuando ocurre un tick del cron se ejecuta la acción
 * correspondiente siempre y cuando el jobs anterior haya terminado o este mismo especifique que puede correr de forma concurrente con otros procesos hermanos.
 *
 * En caso de cuelgues, existe un tiempo por default de 10 minutos de tolerancia. Si se sobrepasa este tiempo, el proceso es finalizado inmediatamente. Mediante
 * el paramentro timeout se puede modificar el tiempo por defecto.
 *
 */

class Scheduler {
    static runningProccess: any = {};

    /**
     *
     * @param job
     * @param child
     */
    static preventDeadLock(job, child: ChildProcess) {
        const timer = job.timeout || defaultTimeout;
        const id = setTimeout(() => {
            log('stoping', job.action, 'timeout');
            child.kill();
        }, timer);
        return id;
    }

    static removeJob(job, child: any) {
        const i = this.runningProccess[job.action].findIndex(item => item.pid === child.pid);
        if (i >= 0) {
            this.runningProccess[job.action].splice(i, 1);
        }
        clearTimeout(child.timer);
    }

    static initialize() {

        /**
         *
         * Cada tarea tiene que exportar una función que se ejecuta
         * cuando se da el tiempo indicado
         *
         */

        log('initialize');

        const _self = this;
        jobs.forEach((job: any) => {
            _self.runningProccess[job.action] = [];
            schedule.scheduleJob(job.when, () => {
                const concurrent = !!job.concurrent;
                if (concurrent || _self.runningProccess[job.action].length === 0) {
                    log(`${job.action}  start`);

                    const child: any = spawn('node', ['jobs/manual.js', job.action], { env: process.env });

                    child.on('close', (code, signal) => {
                        log(`${job.action} finish`);
                        _self.removeJob(job, child);
                    });

                    child.stderr.on('data', (data) => {
                        process.stderr.write(data);
                    });

                    child.stdout.on('data', (data) => {
                        process.stdout.write(data);
                    });

                    child.on('error', (err) => {
                        log(`${job.action} error`, err);
                        _self.removeJob(job, child);
                    });

                    child.timer = _self.preventDeadLock(job, child);
                    _self.runningProccess[job.action].push(child);

                } else {
                    log(`${job.action}  already run`);
                }
            });
        });
    }
}

Scheduler.initialize();
