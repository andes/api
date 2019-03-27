import * as agendaCtrl from './../modules/turnos/controller/agenda';

function run(done) {
    agendaCtrl.actualizarTurnosMobile().then(() => {
        done();
    }).catch(() => {
        done();
    });
}

export = run;
