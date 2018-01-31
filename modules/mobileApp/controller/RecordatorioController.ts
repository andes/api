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

let log = debug('RecordatorioController');

let async = require('async');
let agendasRemainderDays = 1;

/**
 *
 * Recordatorios de turnos
 *
 */

export function buscarTurnosARecordar(dayOffset) {
    return new Promise(async (resolve, reject) => {

        let startDay = moment.utc().add(dayOffset, 'days').startOf('day').toDate();
        let endDay = moment.utc().add(dayOffset, 'days').endOf('day').toDate();

        let matchTurno = {};
        matchTurno['estado'] = { $in: ['disponible', 'publicada'] };
        matchTurno['bloques.turnos.horaInicio'] = { $gte: startDay, $lte: endDay };
        matchTurno['bloques.turnos.estado'] = 'asignado';

        let pipeline = [];

        pipeline = [
            { '$match': matchTurno },
            { '$unwind': '$bloques' },
            { '$unwind': '$bloques.turnos' },
            { '$match': matchTurno }
        ];
        let data = await toArray(agendaModel.aggregate(pipeline).cursor({}).exec());

        let turnos = [];
        data.forEach((elem: any) => {
            let turno = elem.bloques.turnos;
            turno.id = elem.bloques.turnos._id;
            turno.paciente = elem.bloques.turnos.paciente;
            turno.tipoRecordatorio = 'turno';
            turnos.push(turno);
        });

        guardarRecordatorioTurno(turnos, function (ret) {
            resolve();
        });

    });
}


export function guardarRecordatorioTurno(turnos: any[], callback) {

    async.forEach(turnos, function (turno, done) {
        recordatorio.findOne({ idTurno: turno._id }, function (err, objFound) {

            if (objFound) {
                log('__ El recordatorio existe __');
                return done();
            }

            let recordatorioTurno = new recordatorio({
                idTurno: turno._id,
                fechaTurno: turno.horaInicio,
                paciente: turno.paciente,
                tipoRecordatorio: turno.tipoRecordatorio,
                estadoEnvio: false,
            });

            recordatorioTurno.save(function (_err, user: any) {

                if (_err) {
                    return done(_err);
                }

                return done(turno);
            });

        });

    }, callback);
}


export function enviarTurnoRecordatorio() {
    recordatorio.find({ 'estadoEnvio': false }, function (err, elems) {

        elems.forEach((turno: any, index) => {

            let smsOptions: ISms = {
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
        let startDay = moment(new Date()).add(dayOffset, 'days').startOf('day').toDate() as any;
        let endDay = moment(new Date()).add(dayOffset, 'days').endOf('day').toDate() as any;
        let match = {
            'estado': { $in: ['disponible', 'publicada'] },
            'horaInicio': {
                $gte: startDay,
                $lte: endDay
            }
        };

        let pipeline = [
            { $match: match },
            { '$unwind': { 'path': '$profesionales', 'preserveNullAndEmptyArrays': true } },
            { '$unwind': { 'path': '$avisos', 'preserveNullAndEmptyArrays': true } },
            {
                '$match': {
                    'avisos': { '$exists': false }
                }
            },
            {
                '$group': {
                    '_id': { 'profesional': '$profesionales._id' },
                    'agenda': { '$push': '$$ROOT' }
                }
            }
        ];

        let query = agendaModel.aggregate(pipeline).cursor({}).exec();
        let data = await toArray(query);
        return resolve(data);
    });
}

export function recordarAgenda() {
    return agendaRecordatorioQuery(agendasRemainderDays).then((data: any[]) => {
        let stack = [];
        data.forEach(item => {
            let profId = item._id.profesional;
            let date = moment(new Date()).add(agendasRemainderDays, 'days').startOf('day').toDate() as any;

            let recordatorioAgenda = new recordatorio({
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
    recordatorio.find({ tipoRecordatorio: 'agenda', estadoEnvio: false }, function (err, recordatiorios: any) {
        recordatiorios.forEach((item) => {
            Promise.all([
                profesional.findById(item.dataAgenda.profesionalId),
                pacienteApp.findOne({ profesionalId: mongoose.Types.ObjectId(item.dataAgenda.profesionalId) })
            ]).then(datos => {
                if (datos[0] && datos[1]) {
                    let notificacion = {
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


