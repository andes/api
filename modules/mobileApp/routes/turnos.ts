import * as express from 'express';
import * as mongoose from 'mongoose';
import * as agenda from '../../turnos/schemas/agenda';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { organizacionCache } from '../../../core/tm/schemas/organizacionCache';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';
import * as controllerPaciente from '../../../core/mpi/controller/paciente';
// let async = require('async');

const router = express.Router();

// Envía el sms al paciente recordando el turno con 24 Hs de antelación
router.post('/turnos/smsRecordatorioTurno', (req, res, next) => {

    recordatorioController.enviarTurnoRecordatorio();
    res.json({});
});

router.get('/turnos/recordatorioTurno', (req, res, next) => {

    recordatorioController.buscarTurnosARecordar(1);
    res.json({});
});

/**
 * Get turnos del Paciente App
 */

router.get('/turnos', async (req: any, res, next) => {
    const pipelineTurno = [];
    const turnos = [];
    let turno;
    const matchTurno = {};

    const pacienteId = req.user.pacientes[0].id;

    let { paciente } = await controllerPaciente.buscarPaciente(pacienteId);
    if (!paciente) {
        return next({ message: 'no existe el paciente' });
    }

    matchTurno['bloques.turnos.paciente.id'] = { $in: paciente.vinculos };

    // matchTurno['estado'] = 'publicada';

    if (req.query.estado) {
        matchTurno['bloques.turnos.estado'] = req.query.estado;
    }

    if (req.query.asistencia) {
        matchTurno['bloques.turnos.asistencia'] = { $exists: req.query.asistencia };
    }

    // TODO: probar la siguiente condición
    if (req.query.codificado) {
        matchTurno['bloques.turnos.diagnosticos.0'] = { $exists: true };
    }

    if (req.query.horaInicio) {
        matchTurno['bloques.turnos.horaInicio'] = { $gte: new Date(req.query.horaInicio) };
    }

    if (req.query.horaFinal) {
        matchTurno['bloques.turnos.horaInicio'] = { $lt: new Date(req.query.horaFinal) };
    }

    if (req.query.tiposTurno) {
        matchTurno['bloques.turnos.tipoTurno'] = { $in: req.query.tiposTurno };
    }

    pipelineTurno.push({ $match: matchTurno });
    pipelineTurno.push({ $unwind: '$bloques' });
    pipelineTurno.push({ $unwind: '$bloques.turnos' });
    pipelineTurno.push({ $match: matchTurno });
    pipelineTurno.push({
        $group: {
            _id: { id: '$_id', bloqueId: '$bloques._id' },
            agenda_id: { $first: '$_id' },
            agenda_estado: { $first: '$estado' },
            turnos: { $push: '$bloques.turnos' },
            profesionales: { $first: '$profesionales' },
            espacioFisico: { $first: '$espacioFisico' },
            organizacion: { $first: '$organizacion' },
            duracionTurno: { $first: '$bloques.duracionTurno' }
        }
    });
    pipelineTurno.push({
        $group: {
            _id: '$_id.id',
            agenda_id: { $first: '$agenda_id' },
            bloque_id: { $first: '$_id.bloqueId' },
            agenda_estado: { $first: '$agenda_estado' },
            bloques: { $push: { _id: '$_id.bloqueId', turnos: '$turnos' } },
            profesionales: { $first: '$profesionales' },
            espacioFisico: { $first: '$espacioFisico' },
            organizacion: { $first: '$organizacion' },
            duracionTurno: { $first: '$duracionTurno' }
        }
    });

    pipelineTurno.push({ $unwind: '$bloques' });
    pipelineTurno.push({ $unwind: '$bloques.turnos' });
    pipelineTurno.push({ $sort: { 'bloques.turnos.horaInicio': 1 } });

    const data2 = await toArray(agenda.aggregate(pipelineTurno).cursor({}).exec());

    const promisesStack = [];
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
        const reasignado = turno.reasignado && turno.reasignado.siguiente;

        if (turno.reasignado && turno.reasignado.anterior) {
            const promise = new Promise((resolve, reject) => {
                const datos = turno.reasignado.anterior;
                agenda.findById(datos.idAgenda, (err, ag: any) => {
                    if (err) {
                        resolve();
                    }
                    const bloque = ag.bloques.id(datos.idBloque);
                    if (bloque) {
                        const t = bloque.turnos.id(datos.idTurno);
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


});

router.get('/turnos/ubicacion/organizacion/:id', async (req, res, next) => {
    const idOrganizacion = req.params.id;
    const org: any = await Organizacion.findById(idOrganizacion);
    let efector = (Object as any).assign({}, org);
    if (org.codigo && org.codigo.sisa) {
        const orgCache: any = await organizacionCache.findOne({ codigo: org.codigo.sisa });
        efector['coordenadasDeMapa'] = orgCache.coordenadasDeMapa;
        efector['domicilio'] = orgCache.domicilio;
        res.json(efector);
    } else {
        // console.log('efector: ', efector);
        res.json(org);
    }
});

/**
 * Cancela un turno de un paciente
 *
 * @param turno_id {string} Id del turno
 * @param  agenda_id {string} id de la agenda
 */

router.post('/turnos/cancelar', (req: any, res, next) => {
    /* Por el momento usamos el primer paciente */
    const pacienteId = req.user.pacientes[0].id;

    const turnoId = req.body.turno_id;
    const agendaId = req.body.agenda_id;
    const bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }
    agenda.findById(agendaId, (err, agendaObj) => {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        const turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno && turno.estado === 'asignado') {
            if (String(turno.paciente.id) === pacienteId) {
                LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, bloqueId, agendaId);
                agendaCtrl.liberarTurno(req, agendaObj, turno);
                Auth.audit(agendaObj, req);
                return agendaObj.save((error) => {
                    Logger.log(req, 'citas', 'update', {
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

router.post('/turnos/confirmar', (req: any, res, next) => {
    /* Por el momento usamos el primer paciente */
    const pacienteId = req.user.pacientes[0].id;

    const turnoId = req.body.turno_id;
    const agendaId = req.body.agenda_id;
    const bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }

    agenda.findById(agendaId, (err, agendaObj) => {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        const turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno) {
            if (String(turno.paciente.id) === pacienteId) {

                // if (turno.reasignado && turno.reasignado.anterior) {
                if (!turno.confirmedAt) {

                    turno.confirmedAt = new Date();

                    Auth.audit(agendaObj, req);
                    return agendaObj.save((error) => {
                        Logger.log(req, 'citas', 'update', {
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
router.post('/turnos/asistencia', (req: any, res, next) => {
    /* Por el momento usamos el primer paciente */
    const pacienteId = req.user.pacientes[0].id;

    const turnoId = req.body.turno_id;
    const agendaId = req.body.agenda_id;
    const bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }

    agenda.findById(agendaId, (err, agendaObj) => {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        const turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno) {
            if (String(turno.paciente.id) === pacienteId) {

                // if (turno.reasignado && turno.reasignado.anterior) {
                if (!turno.asistencia) {

                    turno.asistencia = 'asistio';

                    Auth.audit(agendaObj, req);
                    return agendaObj.save((error) => {
                        Logger.log(req, 'citas', 'update', {
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

export = router;
