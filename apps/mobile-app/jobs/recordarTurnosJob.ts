import * as recordatorioCtrl from '../controller/RecordatorioController';

function run() {
    recordatorioCtrl.buscarTurnosARecordar(1).then(() => {
        recordatorioCtrl.enviarTurnoRecordatorio();
    });
}

export = run;
