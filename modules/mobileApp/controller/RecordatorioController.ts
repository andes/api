import { recordatorio } from '../schemas/recordatorio';
import * as agendaModel from '../../turnos/schemas/agenda';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { profesional } from '../../../core/tm/schemas/profesional';
import { pacienteApp } from '../schemas/pacienteApp';
import { NotificationService } from './NotificationService';
import { sendSms, ISms } from '../../../utils/roboSender';

import * as debug from 'debug';
import { toArray } from '../../../utils/utils';
import { Problema } from '../schemas/registrosProblemas';
import { Minuta } from '../schemas/minuta';
import { mailGestionModel } from '../schemas/mailGestion';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from '../../../config.private';
import { userScheduler } from '../../../config.private';
import { Auth } from './../../../auth/auth.class';

const log = debug('RecordatorioController');

const async = require('async');
const agendasRemainderDays = 1;

/**
 *
 * Recordatorios de turnos
 *
 */

export function buscarTurnosARecordar(dayOffset) {
    return new Promise(async (resolve, reject) => {

        const startDay = moment.utc().add(dayOffset, 'days').startOf('day').toDate();
        const endDay = moment.utc().add(dayOffset, 'days').endOf('day').toDate();

        const matchTurno = {};
        matchTurno['estado'] = { $in: ['disponible', 'publicada'] };
        matchTurno['bloques.turnos.horaInicio'] = { $gte: startDay, $lte: endDay };
        matchTurno['bloques.turnos.estado'] = 'asignado';

        let pipeline = [];

        pipeline = [
            { $match: matchTurno },
            { $unwind: '$bloques' },
            { $unwind: '$bloques.turnos' },
            { $match: matchTurno }
        ];
        const data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());

        const turnos = [];
        data.forEach((elem: any) => {
            const turno = elem.bloques.turnos;
            turno.id = elem.bloques.turnos._id;
            turno.paciente = elem.bloques.turnos.paciente;
            turno.tipoRecordatorio = 'turno';
            turnos.push(turno);
        });

        guardarRecordatorioTurno(turnos, (ret) => {
            resolve();
        });

    });
}


export function guardarRecordatorioTurno(turnos: any[], callback) {

    async.forEach(turnos, (turno, done) => {
        recordatorio.findOne({ idTurno: turno._id }, (err, objFound) => {

            if (objFound) {
                log('__ El recordatorio existe __');
                return done();
            }

            const recordatorioTurno = new recordatorio({
                idTurno: turno._id,
                fechaTurno: turno.horaInicio,
                paciente: turno.paciente,
                tipoRecordatorio: turno.tipoRecordatorio,
                estadoEnvio: false,
            });

            recordatorioTurno.save((_err, user: any) => {

                if (_err) {
                    return done(_err);
                }

                return done(turno);
            });

        });

    }, callback);
}


export function enviarTurnoRecordatorio() {
    recordatorio.find({ estadoEnvio: false }, (err, elems) => {

        elems.forEach((turno: any, index) => {

            const smsOptions: ISms = {
                phone: turno.paciente.telefono,
                message: 'Sr ' + turno.paciente.apellido + ' le recordamos que tiene un turno para el día: ' + moment(turno.fechaTurno).format('DD/MM/YYYY')
            };

            sendSms(smsOptions);
            turno.estadoEnvio = true;
            turno.save();
            log('El SMS se envío correctamente');

        });
    });
}


/**
 *
 * Recordatorios de agendas
 *
 */

export function agendaRecordatorioQuery(dayOffset) {
    return new Promise(async (resolve, reject) => {
        const startDay = moment(new Date()).add(dayOffset, 'days').startOf('day').toDate() as any;
        const endDay = moment(new Date()).add(dayOffset, 'days').endOf('day').toDate() as any;
        const match = {
            estado: { $in: ['disponible', 'publicada'] },
            horaInicio: {
                $gte: startDay,
                $lte: endDay
            }
        };

        const pipeline = [
            { $match: match },
            { $unwind: { path: '$profesionales', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$avisos', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    avisos: { $exists: false }
                }
            },
            {
                $group: {
                    _id: { profesional: '$profesionales._id' },
                    agenda: { $push: '$$ROOT' }
                }
            }
        ];

        const query = agendaModel.aggregate(pipeline).cursor({}).exec();
        const data = await toArray(query);
        return resolve(data);
    });
}

export function recordarAgenda() {
    return agendaRecordatorioQuery(agendasRemainderDays).then((data: any[]) => {
        const stack = [];
        data.forEach(item => {
            const profId = item._id.profesional;
            const date = moment(new Date()).add(agendasRemainderDays, 'days').startOf('day').toDate() as any;

            const recordatorioAgenda = new recordatorio({
                tipoRecordatorio: 'agenda',
                estadoEnvio: false,
                dataAgenda: {
                    profesionalId: profId,
                    fecha: date
                }
            });

            stack.push(recordatorioAgenda.save());

        });

        return Promise.all(stack);

    });
}

export function enviarAgendaNotificacion() {
    recordatorio.find({ tipoRecordatorio: 'agenda', estadoEnvio: false }, (err, recordatiorios: any) => {
        recordatiorios.forEach((item) => {
            Promise.all([
                profesional.findById(item.dataAgenda.profesionalId),
                pacienteApp.findOne({ profesionalId: mongoose.Types.ObjectId(item.dataAgenda.profesionalId) })
            ]).then(datos => {
                if (datos[0] && datos[1]) {
                    const notificacion = {
                        body: 'Te recordamos que tienes agendas sin confirmar.'
                    };
                    NotificationService.sendNotification(datos[1], notificacion);
                } else {
                    log('No tiene app');
                }
            }).catch(() => {
                log('Error en la cuenta');
            });
            item.estadoEnvio = true;
            item.save();
        });
    });
}


export async function notificarVencimientosMinutas(done?) {
    let destinatarios = await mailGestionModel.find({ alerta: true });
    let destinatariosMails = [];
    for (let index = 0; index < destinatarios.length; index++) {
        destinatariosMails.push((destinatarios[index] as any).direccion);
    }
    const query = {
        $where: 'this.estado !== "resuelto"',
        plazo: { $lt: new Date() },
        vencimientoNotificacion: { $ne: true }
    };
    let problemasVencidos = await Problema.find(query);
    let mensajeProblemas = '';
    for (let index = 0; index < problemasVencidos.length; index++) {
        const unProblema: any = problemasVencidos[index];
        let minuta: any = await Minuta.find({ _id: unProblema.idMinutaMongo });
        let textoMensaje = `<ul><li>Fecha de carga: ${new Date(unProblema.fechaRegistro).toLocaleString()} </li>
                    <li>Responsable: ${unProblema.responsable} </li>
                    <li>Problema: ${unProblema.problema} </li>
                    <li>Quien Registro: ${unProblema.createdBy.nombreCompleto} </li>
                    <li>Fecha de la minuta: ${(minuta.length > 0 ? new Date(minuta[0].fecha).toLocaleString() : '')}</li>
                    <li>Nivel: ${unProblema.origen}</li></ul>`;

        mensajeProblemas = mensajeProblemas + textoMensaje;

    }

    const data = {
        from: configPrivate.enviarMail.auth.user,
        to: destinatariosMails.toString(),
        subject: 'App Gestión: Notificación de vencimientos de problemas',
        text: '',
        html: mensajeProblemas,
        attachments: ''
    };


    let respuesta: any = await SendEmail.sendMail(data);
    if (respuesta.errno === undefined) {
        for (let index = 0; index < problemasVencidos.length; index++) {
            const unProblema: any = problemasVencidos[index];
            unProblema.vencimientoNotificacion = true;
            Auth.audit(unProblema, (userScheduler as any));
            await unProblema.save();
        }
    }

    done();
}
