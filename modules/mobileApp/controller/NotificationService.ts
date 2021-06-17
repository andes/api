import { PushClient } from './PushClient';
import { PacienteApp } from '../schemas/pacienteApp';
import { Agenda } from '../../turnos/schemas/agenda';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as debug from 'debug';
import * as fcm from '../../../modules/mobileApp/controller/PushClientFCM';

const log = debug('NotificationService');

export class NotificationService {

    public static notificarReasignar(datosTurno) {
        this.findTurno(datosTurno).then((turno: any) => {
            const idPaciente = turno.paciente.id;
            moment.locale('es');
            const date = moment(turno.horaInicio).format('DD [de] MMMM');
            const body = 'Su turno del ' + date + ' fue reasignado. Haz click para más información.';
            const notificacion = { body, extraData: { action: 'reasignar' } };

            this.sendByPaciente(idPaciente, notificacion);

        }).catch(() => { log('ERROR'); });
    }

    public static notificarSuspension(turno) {
        if (turno.paciente) {
            const idPaciente = turno.paciente.id;
            moment.locale('es');
            const date = moment(turno.horaInicio).format('DD [de] MMMM [a las] HH:mm');
            const body = 'Su turno del ' + date + ' fue suspendido.';
            const notificacion = { body, extraData: { action: 'suspender' } };
            this.sendByPaciente(idPaciente, notificacion);
        }
    }

    /**
     * Envía notificación de campaña de salud
     */
    public static notificarCampaniaSalud(datosCampania) {
        const notificacion = {
            body: datosCampania.campania.asunto,
            extraData: {
                action: 'campaniaSalud',
                campania: datosCampania.campania
            }
        };
        let idPaciente = mongoose.Types.ObjectId(datosCampania.account.pacientes[0].id);
        this.sendByPaciente(idPaciente, notificacion);
    }

    /**
     * Envia una notificacion de adjunto
     */
    public static solicitudAdjuntos(profesionalId, adjuntoId) {
        const notificacion = {
            title: 'Archivo adjunto Andes RUP',
            body: 'Tocar para ir a adjuntar',
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
            Agenda.findById(datosTurno.idAgenda, (err, ag: any) => {
                if (err) {
                    reject();
                }
                const bloque = ag.bloques.id(datosTurno.idBloque);
                if (bloque) {
                    const t = bloque.turnos.id(datosTurno.idTurno);
                    resolve(t);
                } else {
                    reject();
                }
            });
        });
    }

    public static sendNotification(account, notification) {
        const devices = account.devices.map(item => item.device_id);
        new PushClient().send(devices, notification);
    }

    /**
     * Envia la notificacion a todos los devices de un paciente
     * @param {objectId} pacienteId Id del paciente.
     * @param {INotificacion} notification  Notificacion a enviar.
     */

    private static sendByPaciente(pacienteId, notification) {
        PacienteApp.find({ 'pacientes.id': pacienteId }, (err, docs: any[]) => {
            docs.forEach(user => {
                const devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

    /**
     * Envia la notificacion a todos los devices de un profesional
     * @param {objectId} profesionalId Id de profesional.
     * @param {INotificacion} notification  Notificacion a enviar.
     */
    private static sendByProfesional(id, notification) {
        id = new mongoose.Types.ObjectId(id);
        PacienteApp.find({ profesionalId: id }, (err, docs: any[]) => {
            docs.forEach(user => {
                // Traer el último token válido
                const lastIndex = user.devices.length - 1;
                const deviceToken = user.devices[lastIndex];
                fcm.sendPushNotification(deviceToken, notification);
            });
        });
    }

}
