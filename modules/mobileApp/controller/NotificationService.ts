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

    /**
     * Envia una notificacion de adjunto
     */
    public static solicitudAdjuntos (profesionalId, adjuntoId) {
        let notificacion = {
            body: 'Haz click para adjuntar la foto solicitada',
            extraData: {
                action: 'rup-adjuntar',
                id: adjuntoId
            }
        };
        // let id = new mongoose.Schema.Types.ObjectId(profesionalId);
        // console.log(id);
        this.sendByProfesional(profesionalId, notificacion);
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

    /**
     * Envia la notificacion a todos los devices de un paciente
     * @param {objectId} pacienteId Id del paciente.
     * @param {INotificacion} notification  Notificacion a enviar.
     */

    private static sendByPaciente(pacienteId, notification) {
        pacienteApp.find({ 'pacientes.id': pacienteId }, function (err, docs: any[]) {
            docs.forEach(user => {
                let devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

    /**
     * Envia la notificacion a todos los devices de un profesional
     * @param {objectId} profesionalId Id de profesional.
     * @param {INotificacion} notification  Notificacion a enviar.
     */
    private static sendByProfesional (id, notification) {
        id = new mongoose.Types.ObjectId(id);
        pacienteApp.find({ profesionalId: id }, function (err, docs: any[]) {
            docs.forEach(user => {
                let devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

}
