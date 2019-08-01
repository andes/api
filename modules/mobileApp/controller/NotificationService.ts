import { PushClient } from './PushClient';
import { pacienteApp } from '../schemas/pacienteApp';
import * as agenda from '../../turnos/schemas/agenda';
import * as moment from 'moment';
import { notificationLog } from '../schemas/notificationLog';
import * as mongoose from 'mongoose';
import * as debug from 'debug';

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
            body: 'Haz click para adjuntar la foto solicitada',
            extraData: {
                action: 'rup-adjuntar',
                id: adjuntoId
            }
        };
        // let id = new mongoose.Schema.Types.ObjectId(profesionalId);
        this.sendByProfesional(profesionalId, notificacion);
    }

    private static findTurno(datosTurno) {
        return new Promise((resolve, reject) => {
            agenda.findById(datosTurno.idAgenda, (err, ag: any) => {
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
        pacienteApp.find({ 'pacientes.id': pacienteId }, (err, docs: any[]) => {
            docs.forEach(user => {
                const devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

    /**
     * Crea y pushea el mensaje de recordatorio de turno a un paciente dada la información contenida en el notificationLog recibido por parametro
     * Realiza el envío de la notificación:
     * Si resulta existoso, actualiza el estado del notificationLog a 'enviado'.
     * Si falla, reintenta 2 veces más (3 intentos de envío).
     *
     * @private
     * @static
     * @param {*} nl
     * @memberof NotificationService
     */
    private static sendNotificacionTurno(nl) {
        const foo = async (ds, n, retry) => {
            const abody = nl.paciente.apellido +
                ', le recordamos su próximo turno ' +
                moment(nl.fechaHoraTurno).format('DD') + '/' + moment(nl.fechaHoraTurno).format('MM') + ' ' +  moment(nl.fechaHoraTurno).format('HH:mm') + ' | ' +
                nl.tipoPrestacion.term + ' | ' + nl.organizacion.nombre;

            const notification = {
                body: abody
            };
            const rs = await new PushClient().send(ds, notification);
            rs.forEach( (r: any) => {
                if (r.success > 0 && r.failure === 0) {
                    n.estado = 'enviado';
                    n.save();
                } else if (retry < 3) {
                    retry ++;
                    foo([r.message[0].regId], nl, retry);
                }
            });
        };

        pacienteApp.find({ 'pacientes.id': nl.paciente.id }, (err, docs: any[]) => {
            docs.forEach(user => foo(user.devices.map(item => item.device_id), nl, 0) );
        });
    }

    /**
     * Envia la notificacion a todos los devices de un profesional
     * @param {objectId} profesionalId Id de profesional.
     * @param {INotificacion} notification  Notificacion a enviar.
     */
    private static sendByProfesional(id, notification) {
        id = new mongoose.Types.ObjectId(id);
        pacienteApp.find({ profesionalId: id }, (err, docs: any[]) => {
            docs.forEach(user => {
                const devices = user.devices.map(item => item.device_id);
                new PushClient().send(devices, notification);
            });
        });
    }

    public static saveNotificationLog(turno) {
        new notificationLog({
            idTurno: turno._id,
            fechaHoraTurno: turno.horaInicio    ,
            paciente: {
                id: turno.paciente.id,
                nombre: turno.paciente.nombre,
                apellido: turno.paciente.apellido,
                telefono: turno.paciente.telefono,
            },
            profesionales: turno.profesionales ? turno.profesionales.map( (e: any) => { return  { nombre: e.nombre, apellido: e.apellido }; } ) : [],
            tipoPrestacion: turno.tipoPrestacion,
            organizacion: turno.organizacion,
            estado: 'pendiente'})
        .save();
    }

    /**
     * Encola callbacks de push notifications dados los notificationLog de turnos de la fecha
     *
     * @static
     * @memberof NotificationService
     */
    public static async enviarRecordatoriosTurnos() {
        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();
        const pendingNotifications = await notificationLog.find({
            fechaHoraTurno: {
                $gte: todayStart,
                $lt: todayEnd
            },
            estado: 'pendiente'
        });

        pendingNotifications.forEach( (n: any) => {
            // const timeOut = moment(n.fechaHoraTurno).diff(moment());
            const timeOut = 0;
            setTimeout( () => this.sendNotificacionTurno(n), timeOut);
        });
    }
}
