import { NotificationService } from '../modules/mobileApp/controller/NotificationService';

function run(done) {
    NotificationService.enviarRecordatoriosTurnos();
}

export = run;
