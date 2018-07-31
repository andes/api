import * as agendaHPNCtrl from './../modules/turnos/controller/agendasHPNCacheController';

function run(done) {
    agendaHPNCtrl.integracion().then(done).catch(done);
}
export = run;
