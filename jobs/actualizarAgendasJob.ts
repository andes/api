import * as agendaCtrl from './../modules/turnos/controller/agenda';

function run(done) {
    Promise.all([
        agendaCtrl.actualizarTiposDeTurno(),
        agendaCtrl.actualizarEstadoAgendas()
    ]).then(done).catch(done);
}

export = run;
