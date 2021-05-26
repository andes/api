import * as express from 'express';
import * as mongoose from 'mongoose';
import { Agenda } from '../../turnos/schemas/agenda';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
import { Auth } from './../../../auth/auth.class';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { PatientNotFound } from '../../../core-v2/mpi/paciente/paciente.error';
import { turnosLog, agendaLog } from '../../turnos/citasLog';

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
    let pacienteId;
    let turno;
    const matchTurno = {};
    if (req.query.familiar) {
        const familiar = JSON.parse(req.query.familiar);
        pacienteId = familiar.id;
    } else {
        pacienteId = req.user.pacientes[0].id;
    }
    let paciente: any = await PacienteCtr.findById(pacienteId);
    if (!paciente) {
        throw new PatientNotFound();
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

    const data2 = await toArray(Agenda.aggregate(pipelineTurno).cursor({}).exec());

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
                Agenda.findById(datos.idAgenda, (err, ag: any) => {
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
        efector['coordenadasDeMapa'] = { latitud: org.direccion.geoReferencia[0], longitud: org.direccion.geoReferencia[1] };
        efector['domicilio'] = org.direccion.valor;
        res.json(efector);
    } else {
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
    let pacienteId;
    if (req.body.familiar) {
        pacienteId = req.body.familiar.id;
    } else {
        pacienteId = req.user.pacientes[0].id;
    }
    /* Por el momento usamos el primer paciente */

    const turnoId = req.body.turno_id;
    const agendaId = req.body.agenda_id;
    const bloqueId = req.body.bloque_id;

    if (!mongoose.Types.ObjectId.isValid(agendaId)) {
        return next('ObjectID Inválido');
    }
    Agenda.findById(agendaId, async (err, agendaObj) => {
        if (err) {
            return res.status(422).send({ message: 'agenda_id_invalid' });
        }
        const turno = agendaCtrl.getTurno(req, agendaObj, turnoId);
        if (turno && turno.estado === 'asignado') {
            if (String(turno.paciente.id) === pacienteId) {
                LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, bloqueId, agendaId);
                let liberado = await agendaCtrl.liberarTurno(req, agendaObj, turno);
                if (!liberado) {
                    return next('Turno en ejecución');
                }
                Auth.audit(agendaObj, req);
                return agendaObj.save((error) => {
                    const objetoLog = {
                        accion: 'liberarTurno',
                        ruta: req.url,
                        method: req.method,
                        data: agendaObj,
                        err: error || false
                    };
                    turnosLog.info('update', objetoLog, req);
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

    Agenda.findById(agendaId, (err, agendaObj) => {
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
                        const objetoLog = {
                            accion: 'confirmar',
                            ruta: req.url,
                            method: req.method,
                            data: agendaObj,
                            err: error || false
                        };
                        turnosLog.info('update', objetoLog, req);
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

    Agenda.findById(agendaId, (err, agendaObj) => {
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
                        const objetoLog = {
                            accion: 'asistencia',
                            ruta: req.url,
                            method: req.method,
                            data: agendaObj,
                            err: error || false
                        };
                        agendaLog.info('update', objetoLog, req);
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
