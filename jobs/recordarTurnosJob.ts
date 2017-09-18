import * as recordatorioCtrl from './../modules/mobileApp/controller/RecordatorioController';

function run() {
    recordatorioCtrl.buscarTurnosARecordar(1).then(() => {
        recordatorioCtrl.enviarTurnoRecordatorio();
    });
}

export = run;
