import { pacienteApp } from '../schemas/pacienteApp';
import { recordatorio } from '../schemas/recordatorio';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agenda from '../../turnos/schemas/agenda';
import { paciente } from '../../../core/mpi/schemas/paciente';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { INotification, PushClient } from '../controller/PushClient';
import * as authController from '../controller/AuthController';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';

import { sendSms, SmsOptions } from '../../../utils/sendSms';

// let async = require('async');

let router = express.Router();

// Envía el sms al paciente recordando el turno con 24 Hs de antelación
router.post('/turnos/smsRecordatorioTurno', function (req, res, next) {

    recordatorio.find({ 'estadoEnvio': false }, function (err, data) {

        data.forEach((turno: any, index) => {

            let smsOptions: SmsOptions = {
                telefono: turno.paciente.telefono,
                mensaje: 'Sr ' + turno.paciente.apellido + 'Le recordamos que tiene un turno para el día: ' + moment(turno.fechaTurno).format('DD/MM/YYYY')
            }

            sendSms(smsOptions, function (res) {
                if (res === '0') {
                    recordatorio.findById(turno._id, function (err, dato) {
                        turno.estadoEnvio = true;

                        turno.save();
                    });
                    console.log("El SMS se envío correctamente");
                }
            });
        });

        res.json(data);
    });
});

router.get('/turnos/recordatorioTurno', function (req, res, next) {

    let startDay = moment.utc().add(1, 'days').startOf('day').toDate();
    let endDay = moment.utc().add(1, 'days').endOf('day').toDate();

    let pipelineTurno = [];
    let turnos = [];
    let turno;

    pipelineTurno = [{
        '$match': {
        }
    },
    // Unwind cada array
    { '$unwind': '$bloques' },
    { '$unwind': '$bloques.turnos' },
    // Filtra los elementos que matchean
    {
        '$match': {
        }
    },
    {
        '$group': {
            '_id': { 'id': '$_id', 'bloqueId': '$bloques._id' },
            'turnos': { $push: '$bloques.turnos' }
        }
    },
    {
        '$group': {
            '_id': '$_id.id',
            'bloques': { $push: { '_id': '$_id.bloqueId', 'turnos': '$turnos' } }
        }
    }];

    // Se modifica el pipeline en la posición 0 y 3, que son las posiciones
    // donde se realiza el match
    let matchTurno = {};

    matchTurno['bloques.turnos.horaInicio'] = { $gte: startDay, $lte: endDay };
    matchTurno['bloques.turnos.estado'] = 'asignado';

    pipelineTurno[0] = { '$match': matchTurno };
    pipelineTurno[3] = { '$match': matchTurno };
    pipelineTurno[6] = { '$unwind': '$bloques' };
    pipelineTurno[7] = { '$unwind': '$bloques.turnos' };

    agenda.aggregate(pipelineTurno,
        function (err2, data2) {
            if (err2) {
                return next(err2);
            }

            data2.forEach(elem => {
                turno = elem.bloques.turnos;
                turno.id = elem.bloques.turnos._id;
                turno.paciente = elem.bloques.turnos.paciente;
                turno.tipoRecordatorio = 'turno';
                turnos.push(turno);
            });

            async.forEach(turnos, function (turno, callback) {
                console.log('Turnoo ', turno);
                let recordatorioTurno = new recordatorio({
                    fechaTurno: turno.horaInicio,
                    paciente: turno.paciente,
                    tipoRecordatorio: turno.tipoRecordatorio,
                    estadoEnvio: false,
                });

                recordatorioTurno.save((err) => {
                    if (err) {
                        return next(err);
                    }

                });
                next(turno);
            });
        });
});

router.get('/turnos', function (req: any, res, next) {
    let pipelineTurno = [];
    let turnos = [];
    let turno;
    let matchTurno = {};

    let pacienteId = req.user.pacientes[0].id;

    matchTurno['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(pacienteId);

    // matchTurno['estado'] = 'publicada';

    if (req.query.estado) {
        matchTurno['bloques.turnos.estado'] = req.query.estado;
    };

    if (req.query.asistencia) {
        matchTurno['bloques.turnos.asistencia'] = { '$exists': req.query.asistencia };
    };

    if (req.query.codificado) {
        matchTurno['bloques.turnos.diagnosticoPrincipal'] = { '$exists': true };
    };

    if (req.query.horaInicio) {
        matchTurno['bloques.turnos.horaInicio'] = { '$gte': new Date(req.query.horaInicio) };
    };

    if (req.query.horaFinal) {
        matchTurno['bloques.turnos.horaInicio'] = { '$lt': new Date(req.query.horaFinal) };
    };

    if (req.query.tiposTurno) {
        matchTurno['bloques.turnos.tipoTurno'] = { '$in': req.query.tiposTurno };
    };

    pipelineTurno.push({ '$match': matchTurno });
    pipelineTurno.push({ '$unwind': '$bloques' });
    pipelineTurno.push({ '$unwind': '$bloques.turnos' });
    pipelineTurno.push({ '$match': matchTurno });
    pipelineTurno.push({
        '$group': {
            '_id': { 'id': '$_id', 'bloqueId': '$bloques._id' },
            'agenda_id': { $first: '$_id' },
            'agenda_estado': { $first: '$estado' },
            'turnos': { $push: '$bloques.turnos' },
            'profesionales': { $first: '$profesionales' },
            'espacioFisico': { $first: '$espacioFisico' },
            'organizacion': { $first: '$organizacion' },
            'duracionTurno': { $first: '$bloques.duracionTurno' }
        }
    });
    pipelineTurno.push({
        '$group': {
            '_id': '$_id.id',
            'agenda_id': { $first: '$agenda_id' },
            'bloque_id': { $first: '$_id.bloqueId' },
            'agenda_estado': { $first: '$agenda_estado' },
            'bloques': { $push: { '_id': '$_id.bloqueId', 'turnos': '$turnos' } },
            'profesionales': { $first: '$profesionales' },
            'espacioFisico': { $first: '$espacioFisico' },
            'organizacion': { $first: '$organizacion' },
            'duracionTurno': { $first: '$duracionTurno' }
        }
    });

    pipelineTurno.push({ '$unwind': '$bloques' });
    pipelineTurno.push({ '$unwind': '$bloques.turnos' });
    pipelineTurno.push({ '$sort': { 'bloques.turnos.horaInicio': 1 } });

    agenda.aggregate(
        pipelineTurno,
        function (err2, data2) {
            if (err2) {
                return next(err2);
            }
            let promisesStack = [];
            data2.forEach(elem => {
                turno = elem.bloques.turnos;
                turno.paciente = elem.bloques.turnos.paciente;
                turno.profesionales = elem.profesionales;
                turno.organizacion = elem.organizacion;
                turno.espacioFisico = elem.espacioFisico;
                turno.agenda_id = elem.agenda_id;
                turno.duracionTurno = elem.duracionTurno;
                turno.bloque_id = elem.bloque_id;
                turno.agenda_estado = elem.agenda_estado;

                delete turno.updatedBy;
                delete turno.updatedAt;

                /* Busco el turno anterior cuando fue reasignado */
                let suspendido = turno.estado === 'suspendido' || turno.agenda_estado === 'suspendida';
                let reasignado = turno.reasignado && turno.reasignado.siguiente;

                if (turno.reasignado && turno.reasignado.anterior) {
                    let promise = new Promise((resolve, reject) => {
                        let datos = turno.reasignado.anterior;
                        agenda.findById(datos.idAgenda, function (err, ag: any) {
                            if (err) {
                                resolve();
                            }
                            let bloque = ag.bloques.id(datos.idBloque);
                            if (bloque) {
                                let t = bloque.turnos.id(datos.idTurno);
                                turno.reasignado_anterior = t;
                                // turno.confirmadoAt = turno.reasignado.confirmadoAt;
                                delete turno['reasignado'];
                                resolve();
                            } else {
                                resolve();
                            }
                        });
                    });

                    promisesStack.push(promise);
                }

                /* si el turno fue reasignado mostramos el proximo turno y no este */
                if (!reasignado) {
                    turnos.push(turno);
                }
            });

            if (promisesStack.length === 0) {
                promisesStack.push(Promise.resolve());
            }

            Promise.all(promisesStack).then(() => {
                res.json(turnos);
            }).catch((err) => {
                res.status(422).json({ message: err });
            });

            /*
            pacienteApp.find({ 'pacientes.id': pacienteId }, function (err, docs: any[]) {
                docs.forEach(user => {
                    let devices = user.devices.map(item => item.device_id);
 
                    //let date = moment(turno.horaInicio).format('DD [de] MMMM');
                    let body = 'Su turno del  fue reasignado. Haz click para más información.';
                    new PushClient().send(devices, { body, extraData: { action: 'reasignar' } });
 
                });
            });
            */
        }
    );

});

/**
 * Cancela un turno de un paciente
 *
 * @param turno_id {string} Id del turno
 * @param  agenda_id {string} id de la agenda
 */

router.post('/turnos/cancelar', function (req: any, res, next) {
    /* Por el momento usamos el primer paciente */
    let pacienteId = req.user.pacientes[0].id;

    let turnoId = req.body.turno_id;
    let agendaId = req.body.agenda_id;
    let bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }

    agenda.findById(agendaId, function (err, agendaObj) {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        let turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno) {
            if (String(turno.paciente.id) === pacienteId) {
                LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, bloqueId, agendaId);

                agendaCtrl.liberarTurno(req, agendaObj, turno);

                Auth.audit(agendaObj, req);
                agendaObj.save(function (error) {
                    Logger.log(req, 'turnos', 'update', {
                        accion: 'liberarTurno',
                        ruta: req.url,
                        method: req.method,
                        data: agendaObj,
                        err: error || false
                    });
                    if (error) {
                        return next(error);
                    }
                    return res.json({ message: 'OK' });
                });


            } else {
                return res.status(422).send({ message: 'unauthorized' });
            }
        } else {
            return res.status(422).send({ message: 'turno_id_invalid' });
        }
    });
});

/**
 * Confirma un turno
 *
 * @param turno_id {string} Id del turno
 * @param agenda_id {string} id de la agenda
 * @param bloque_id {string} id del bloque
 */

router.post('/turnos/confirmar', function (req: any, res, next) {
    /* Por el momento usamos el primer paciente */
    let pacienteId = req.user.pacientes[0].id;

    let turnoId = req.body.turno_id;
    let agendaId = req.body.agenda_id;
    let bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }

    agenda.findById(agendaId, function (err, agendaObj) {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        let turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno) {
            if (String(turno.paciente.id) === pacienteId) {

                // if (turno.reasignado && turno.reasignado.anterior) {
                if (!turno.confirmedAt) {

                    turno.confirmedAt = new Date();

                    Auth.audit(agendaObj, req);
                    agendaObj.save(function (error) {
                        Logger.log(req, 'turnos', 'update', {
                            accion: 'confirmar',
                            ruta: req.url,
                            method: req.method,
                            data: agendaObj,
                            err: error || false
                        });


                        LoggerPaciente.logTurno(req, 'turnos:confirmar', turno.paciente, turno, bloqueId, agendaId);

                        if (error) {
                            return next(error);
                        } else {
                            return res.json({ message: 'OK' });
                        }
                    });
                } else {
                    return res.status(422).send({ message: 'turno_ya_corfirmado' });
                }
                // } else {
                //     return res.status(422).send({ message: 'turno_not_reasignado' });
                // }
            } else {
                return res.status(422).send({ message: 'unauthorized' });
            }
        } else {
            return res.status(422).send({ message: 'turno_id_invalid' });
        }
    });
});

/**
 * Crea un usuario apartir de un paciente
 * @param id {string} ID del paciente a crear
 */

router.post('/create/:id', function (req: any, res, next) {
    if (!req.user.profesional) {
        return res.status(401).send('unauthorized');
    }
    let pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    authController.buscarPaciente(pacienteId).then((pacienteObj) => {
        authController.createUserFromPaciente(pacienteObj).then(() => {
            return res.send({ message: 'OK' });
        }).catch((error) => {
            return res.send(error);
        });
    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });
});

/**
 * Check estado de la cuenta
 * @param id {string} ID del paciente a chequear
 */

router.get('/check/:id', function (req: any, res, next) {
    if (!req.user.profesional) {
        return res.status(401).send('unauthorized');
    }

    let pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    authController.buscarPaciente(pacienteId).then((pacienteObj) => {

        authController.checkAppAccounts(pacienteObj).then(() => {
            return res.send({ message: 'OK' });
        }).catch((error) => {
            return res.send(error);
        });
    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });
});

export = router;