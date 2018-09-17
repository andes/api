import * as agendaCtrl from './../modules/turnos/controller/agendasCacheController';

function run(done) {
    agendaCtrl.integracionAndes(done);
}

export = run;
