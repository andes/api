import * as express from 'express';
import * as mongoose from 'mongoose';
import * as agenda from '../../turnos/schemas/agenda';
import * as agendaCtrl from '../../turnos/controller/agenda';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as recordatorioController from '../controller/RecordatorioController';
import { LoggerPaciente } from '../../../utils/loggerPaciente';
import { toArray } from '../../../utils/utils';

const router = express.Router();

/**
 * Get agendas con turnos disponibles
 */

router.get('/agendasDisponibles', async (req: any, res, next) => {
    const pipelineAgendas = [];
    const matchAgendas = {};
    const turnos = [];
    let turno;

    console.log('llega aca? ');

    const pacienteId = req.user.pacientes[0].id;

    matchAgendas['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(pacienteId);

    if (req.query.horaInicio) {
        matchAgendas['horaInicio'] = { $gte: new Date(req.query.horaInicio) };
    }

    if (req.query.tiposTurno) {
        matchAgendas['tipoPrestaciones.term'] = '/odonto/';
    }

    pipelineAgendas.push({ $match: matchAgendas });
    // pipelineTurno.push({ $unwind: '$bloques' });
    // pipelineTurno.push({ $unwind: '$bloques.turnos' });
    // pipelineTurno.push({ $match: matchTurno });
    // pipelineTurno.push({
    //     $group: {
    //         _id: { id: '$_id', bloqueId: '$bloques._id' },
    //         agenda_id: { $first: '$_id' },
    //         agenda_estado: { $first: '$estado' },
    //         turnos: { $push: '$bloques.turnos' },
    //         profesionales: { $first: '$profesionales' },
    //         espacioFisico: { $first: '$espacioFisico' },
    //         organizacion: { $first: '$organizacion' },
    //         duracionTurno: { $first: '$bloques.duracionTurno' }
    //     }
    // });
    // pipelineTurno.push({
    //     $group: {
    //         _id: '$_id.id',
    //         agenda_id: { $first: '$agenda_id' },
    //         bloque_id: { $first: '$_id.bloqueId' },
    //         agenda_estado: { $first: '$agenda_estado' },
    //         bloques: { $push: { _id: '$_id.bloqueId', turnos: '$turnos' } },
    //         profesionales: { $first: '$profesionales' },
    //         espacioFisico: { $first: '$espacioFisico' },
    //         organizacion: { $first: '$organizacion' },
    //         duracionTurno: { $first: '$duracionTurno' }
    //     }
    // });

    // pipelineTurno.push({ $unwind: '$bloques' });
    // pipelineTurno.push({ $unwind: '$bloques.turnos' });
    // pipelineTurno.push({ $sort: { 'bloques.turnos.horaInicio': 1 } });

    const data2 = await toArray(agenda.aggregate(pipelineAgendas).cursor({}).exec());

    const promisesStack = [];
    data2.forEach(elem => {
        console.log('por cada elemento: ', elem);
        // turno = elem.bloques.turnos;
        // turno.paciente = elem.bloques.turnos.paciente;
        // turno.profesionales = elem.profesionales;
        // turno.organizacion = elem.organizacion;
        // turno.espacioFisico = elem.espacioFisico;
        // turno.agenda_id = elem.agenda_id;
        // turno.duracionTurno = elem.duracionTurno;
        // turno.bloque_id = elem.bloque_id;
        // turno.agenda_estado = elem.agenda_estado;

        // delete turno.updatedBy;
        // delete turno.updatedAt;

        // /* Busco el turno anterior cuando fue reasignado */
        // const reasignado = turno.reasignado && turno.reasignado.siguiente;

        // if (turno.reasignado && turno.reasignado.anterior) {
        //     const promise = new Promise((resolve, reject) => {
        //         const datos = turno.reasignado.anterior;
        //         agenda.findById(datos.idAgenda, (err, ag: any) => {
        //             if (err) {
        //                 resolve();
        //             }
        //             const bloque = ag.bloques.id(datos.idBloque);
        //             if (bloque) {
        //                 const t = bloque.turnos.id(datos.idTurno);
        //                 turno.reasignado_anterior = t;
        //                 // turno.confirmadoAt = turno.reasignado.confirmadoAt;
        //                 delete turno['reasignado'];
        //                 resolve();
        //             } else {
        //                 resolve();
        //             }
        //         });
        //     });

        //     promisesStack.push(promise);
        // }

        /* si el turno fue reasignado mostramos el proximo turno y no este */
        // if (!reasignado) {
        //     turnos.push(turno);
        // }
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

export = router;
