import * as agendaCtrl from './../modules/turnos/controller/agenda';

function run() {
    agendaCtrl.actualizarTiposDeTurno();
    agendaCtrl.actualizarEstadoAgendas();
}

export = run;
