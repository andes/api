import * as agendaCtrl from './../modules/turnos/controller/agendasCacheController';

function run(done) {
    agendaCtrl.integracionSips(done);
}

export = run;
