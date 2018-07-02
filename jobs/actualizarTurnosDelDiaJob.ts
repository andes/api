import * as agendaCtrl from './../modules/turnos/controller/agenda';

function run(done) {
    agendaCtrl.actualizarTurnosDelDia().then(() => {
        done();
    }).catch(() => {
        done();
    });
}

export = run;
