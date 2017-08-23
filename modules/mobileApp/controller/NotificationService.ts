import { INotification, PushClient } from './PushClient';
import { pacienteApp } from '../schemas/pacienteApp';
import * as agenda from '../../turnos/schemas/agenda';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as debug from 'debug';

let log = debug('NotificationService');

export class NotificationService {

    public static notificarReasignar(datosTurno) {
        this.findTurno(datosTurno).then((turno: any) => {
            let idPaciente = turno.paciente.id;
            moment.locale('es');
            let date = moment(turno.horaInicio).format('DD [de] MMMM');
            let body = 'Su turno del ' + date + ' fue reasignado. Haz click para más información.';
            let notificacion = { body, extraData: { action: 'reasignar' } };

            this.sendByPaciente(idPaciente, notificacion);

        }).catch(() => { log('ERROR'); });
    }

    private static findTurno(datosTurno) {
        return new Promise((resolve, reject) => {
            agenda.findById(datosTurno.idAgenda, function (err, ag: any) {
                if (err) {
                    reject();
                }
                let bloque = ag.bloques.id(datosTurno.idBloque);
                if (bloque) {
                    let t = bloque.turnos.id(datosTurno.idTurno);
                    resolve(t);
                } else {
                    reject();
                }
            });
        });
    }

    public static sendNotification(account, notification) {
        let devices = account.devices.map(item => item.device_id);
        new PushClient().send(devices, notification);
    }

    private static sendByPaciente(pacienteId, notification) {
        pacienteApp.find({ 'pacientes.id': pacienteId }, function (err, docs: any[]) {
            docs.forEach(user => {
                let devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

}
