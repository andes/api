import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agenda from '../../turnos/schemas/agenda';
import { paciente } from '../../../core/mpi/schemas/paciente';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import { INotification, PushClient } from '../controller/PushClient';

let router = express.Router();

router.get('/turnos', function (req: any, res, next) {

    let pipelineTurno = [];
    let turnos = [];
    let turno;
    let matchTurno = {};

    matchTurno['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(req.user.idPaciente);
    matchTurno['estado'] = 'publicada';

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
                delete turno.updatedBy;
                delete turno.updatedAt;

                /* Busco el turno anterior cuando fue reasignado */
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
                                turno.confirmadoAt = turno.reasignado.confirmadoAt;
                                delete turno['reasignado'];
                                resolve();
                            } else {
                                resolve();
                            }
                        });
                    });
                    promisesStack.push(promise);
                }
                turnos.push(turno);
            });

            if (promisesStack.length == 0) {
                promisesStack.push(Promise.resolve());
            }

            Promise.all(promisesStack).then(() => {
                res.json(turnos);
            }).catch((err) => {
                res.status(422).json({ message: err });
            });

            /*
            let user_id = req.user._id;
            pacienteApp.findById(user_id, function (err, user: any) {
                //new PushClient().send(user.devices[0].device_id, { body: 'Tus turnos' });
                console.log(user.devices.map(item => item.device_id));
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
    let pacienteId = req.user.idPaciente;
    let turnoId = req.body.turno_id;
    let agendaId = req.body.agenda_id;

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
                agendaCtrl.liberarTurno(req, agendaObj, turnoId);

                Auth.audit(agendaObj, req);
                agendaObj.save(function (error) {
                    Logger.log(req, 'turnos', 'update', {
                        accion: "liberarTurno",
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
 * Confirma un turno reasginado
 * 
 * @param turno_id {string} Id del turno
 * @param  agenda_id {string} id de la agenda
 */

router.post('/turnos/confirmar', function (req: any, res, next) {
    let pacienteId = req.user.idPaciente;
    let turnoId = req.body.turno_id;
    let agendaId = req.body.agenda_id;

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

                if (turno.reasignado && turno.reasignado.anterior) {
                    if (!turno.reasignado.confirmadoAt) {

                        turno.reasignado.confirmadoAt = new Date();

                        Auth.audit(agendaObj, req);
                        agendaObj.save(function (error) {
                            Logger.log(req, 'turnos', 'update', {
                                accion: "confirmar",
                                ruta: req.url,
                                method: req.method,
                                data: agendaObj,
                                err: error || false
                            });
                            if (error) {
                                return next(error);
                            } else {
                                return res.json({ message: 'OK' });
                            }
                        });
                    } else {
                        return res.status(422).send({ message: 'turno_corfirmado' });
                    }
                } else {
                    return res.status(422).send({ message: 'turno_not_reasignado' });
                }
            } else {
                return res.status(422).send({ message: 'unauthorized' });
            }
        } else {
            return res.status(422).send({ message: 'turno_id_invalid' });
        }
    });
});


export = router;