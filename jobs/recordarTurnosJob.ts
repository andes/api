import * as recordatorioCtrl from '../apps/mobile-app/controller/RecordatorioController';

function run() {
    recordatorioCtrl.buscarTurnosARecordar(1).then(() => {
        recordatorioCtrl.enviarTurnoRecordatorio();
    });
}

export = run;
