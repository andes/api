import { jobs } from '../config.private';
import * as debug from 'debug';
import { spawn, ChildProcess } from 'child_process';

let schedule = require('node-schedule');
const log = debug('jobs');

class Scheduler {
    static runningProccess: any = {};

    static preventDeadLock(job, child: ChildProcess) {
        let id = setTimeout(() => {
            log('stoping' , job.action, 'timeout');
            child.kill();
        }, 1000 * 60 * 10 ); // 10 minutes
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

        let _self = this;
        jobs.forEach(job => {
            _self.runningProccess[job.action] = [];
            schedule.scheduleJob(job.when, function () {
                log(`${job.action}  start`);

                let child: any = spawn('node', ['jobs/manual.js', job.action], { env: process.env });

                child.on('close', function (code, signal) {
                    log(`${job.action} finish`);
                    _self.removeJob(job,  child);
                });

                child.stderr.on('data', (data) => {
                    process.stderr.write(data);
                });

                child.stdout.on('data', (data) => {
                    process.stdout.write(data);
                });

                child.on('error', (err) => {
                    log(`${job.action} error`, err);
                    _self.removeJob(job,  child);
                });

                child.timer = _self.preventDeadLock(job, child);
                _self.runningProccess[job.action].push(child);

            });
        });
    }
}

Scheduler.initialize();
