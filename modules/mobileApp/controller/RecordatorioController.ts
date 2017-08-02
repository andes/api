import { recordatorio } from '../schemas/recordatorio';
import * as agendaModel from '../../turnos/schemas/agenda';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import { profesional } from '../../../core/tm/schemas/profesional';
import { pacienteApp } from '../schemas/pacienteApp';
import { NotificationService } from './NotificationService';

let async = require('async');
let agendasRemainderDays = 1;


export function guardarRecordatorioTurno(turnos: any[], callback) {

    async.forEach(turnos, function (turno, callback) {

        let recordatorioTurno = new recordatorio({
            idTurno: turno._id,
            fechaTurno: turno.horaInicio,
            paciente: turno.paciente,
            tipoRecordatorio: turno.tipoRecordatorio,
            estadoEnvio: false,
        });

        recordatorio.findOne({ idTurno: recordatorioTurno.idTurno }, function (err, turno) {

            if (turno) {
                // return res.status(422).send({ 'email': 'El e-mail ingresado está en uso' });
                console.log('El recordatorio existe');
            }

            recordatorioTurno.save(function (err, user: any) {

                if (err) {
                    return callback(err);
                }

                return callback(turno);
            });

        });
    });
};

/**
 *
 * Recordatorios de agendas
 *
 */


export function agendaRecordatorioQuery(dayOffset) {
    return new Promise((resolve, reject) => {
        let startDay = moment(new Date()).add(dayOffset, 'days').startOf('day').toDate() as any;
        let endDay = moment(new Date()).add(dayOffset, 'days').endOf('day').toDate() as any;
        let match = {
            'estado': { $in: ['disponible', 'publicada'] },
            'horaInicio': {
                $get: startDay,
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

        let query = agendaModel.aggregate(pipeline);
        query.exec(function (err, data) {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

export function makeRecordatorio(agenda) {
    agenda.profesionales.forEach(prof => {
        let recordatorioAgenda = new recordatorio({
            tipoRecordatorio: 'agenda',
            estadoEnvio: false,
            dataAgenda: {
                agendaId: agenda._id,
                profesionalId: prof._id
            }
        });

        recordatorioAgenda.save((err) => {
            if (err) {
                return null;
            }
        });
    });
}

export function recordarAgenda() {
    agendaRecordatorioQuery(agendasRemainderDays).then((data: any[]) => {
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

            recordatorioAgenda.save((err) => {
                if (err) {
                    return null;
                }
            });

        });
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
                        body: 'Te recordamos que tienes agendas sin confirmar'
                    }
                    NotificationService.sendNotification(datos[2], notificacion);
                }
            }).catch(() => {
                console.log('Error en la cuenta');
            });
            item.estadoEnvio = true;
            item.save();
        });
    });
}


