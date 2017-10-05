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
import * as controllerPaciente from '../../../core/mpi/controller/paciente';
import { sendSms, SmsOptions } from '../../../utils/sendSms';

// let async = require('async');

let router = express.Router();

// Envía el sms al paciente recordando el turno con 24 Hs de antelación
router.post('/turnos/smsRecordatorioTurno', function (req, res, next) {

    recordatorioController.enviarTurnoRecordatorio();
    res.json({});
});

router.get('/turnos/recordatorioTurno', function (req, res, next) {

    recordatorioController.buscarTurnosARecordar(1);
    res.json({});
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
    }

    if (req.query.asistencia) {
        matchTurno['bloques.turnos.asistencia'] = { '$exists': req.query.asistencia };
    }

    if (req.query.codificado) {
        matchTurno['bloques.turnos.diagnosticoPrincipal'] = { '$exists': true };
    }

    if (req.query.horaInicio) {
        matchTurno['bloques.turnos.horaInicio'] = { '$gte': new Date(req.query.horaInicio) };
    }

    if (req.query.horaFinal) {
        matchTurno['bloques.turnos.horaInicio'] = { '$lt': new Date(req.query.horaFinal) };
    }

    if (req.query.tiposTurno) {
        matchTurno['bloques.turnos.tipoTurno'] = { '$in': req.query.tiposTurno };
    }

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
                return agendaObj.save(function (error) {
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
                    return agendaObj.save(function (error) {
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
            } else {
                return res.status(422).send({ message: 'unauthorized' });
            }
        } else {
            return res.status(422).send({ message: 'turno_id_invalid' });
        }
    });
});

/**
 * Confirma asistencia de un turno
 *
 * @param turno_id {string} Id del turno
 * @param agenda_id {string} id de la agenda
 * @param bloque_id {string} id del bloque
 */
router.post('/turnos/asistencia', function (req: any, res, next) {
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
                if (!turno.asistencia) {

                    turno.asistencia = 'asistio';

                    Auth.audit(agendaObj, req);
                    return agendaObj.save(function (error) {
                        Logger.log(req, 'turnos', 'update', {
                            accion: 'asistencia',
                            ruta: req.url,
                            method: req.method,
                            data: agendaObj,
                            err: error || false
                        });


                        LoggerPaciente.logTurno(req, 'turnos:asistencia', turno.paciente, turno, bloqueId, agendaId);

                        if (error) {
                            return next(error);
                        } else {
                            return res.json({ message: 'OK' });
                        }
                    });
                } else {
                    return res.status(422).send({ message: 'turno_ya_asistido' });
                }
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

    // [2017-09-28] TODO: Revisar qué permisos chequear
    // if (!req.user.profesional) {
    //     return res.status(401).send('unauthorized');
    // }
    let pacienteId = req.params.id;
    let contacto = req.body;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;
        authController.createUserFromPaciente(pacienteObj, contacto).then(() => {
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

    // [2017-09-28] TODO: Revisar qué permisos chequear
    // if (!req.user.profesional) {
    //     return res.status(401).send('unauthorized');
    // }

    let pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;
        authController.checkAppAccounts(pacienteObj).then((resultado2) => {
            return res.send(resultado2);
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

router.put('/update/:id', function (req: any, res, next) {

    let pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;
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
