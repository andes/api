import * as agendaCtrl from './../modules/turnos/controller/agendasCacheController';
import * as agendaHPNCtrl from './../modules/turnos/controller/agendasHPNCacheController';

function run() {
    agendaCtrl.integracionSips();
    agendaHPNCtrl.integracion();
}

export = run;
