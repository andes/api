import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agenda from '../../turnos/schemas/agenda';
import { paciente } from '../../../core/mpi/schemas/paciente';

let router = express.Router();

router.get('/turnos', function (req: any, res, next) {

    let pipelineTurno = [];
    let turnos = [];
    let turno;

    let matchTurno = {};

    matchTurno['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(req.user.idPaciente);

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
        matchTurno['bloques.turnos.horaInicio'] = { '$gte': req.query.horaInicio };
    };

    if (req.query.horaFinal) {
        matchTurno['bloques.turnos.horaInicio'] = { '$lt': req.query.horaFinal };
    };

    if (req.query.tiposTurno) {
        matchTurno['bloques.turnos.tipoTurno'] = { '$in': req.query.tiposTurno };
    };

    // if (req.query.pacienteId) {

    // };

    pipelineTurno.push({ '$match': matchTurno });
    pipelineTurno.push({ '$unwind': '$bloques' });
    pipelineTurno.push({ '$unwind': '$bloques.turnos' });
    pipelineTurno.push({ '$match': matchTurno });
    pipelineTurno.push({
        '$group': {
            '_id': { 'id': '$_id', 'bloqueId': '$bloques._id' },
            'turnos': { $push: '$bloques.turnos' },
            'profesionales': { $first: '$profesionales' },
            'espacioFisico': { $first: '$espacioFisico' },
            'organizacion': { $first: '$organizacion' }
        }
    });
    pipelineTurno.push({
        '$group': {
            '_id': '$_id.id',
            'bloques': { $push: { '_id': '$_id.bloqueId', 'turnos': '$turnos' } },
            'profesionales': { $first: '$profesionales' },
            'espacioFisico': { $first: '$espacioFisico' },
            'organizacion': { $first: '$organizacion' }
        }
    });

    pipelineTurno.push({ '$unwind': '$bloques' });
    pipelineTurno.push({ '$unwind': '$bloques.turnos' });

    agenda.aggregate(
        pipelineTurno,
        function (err2, data2) {
            if (err2) {
                return next(err2);
            }

            data2.forEach(elem => {
                turno = elem.bloques.turnos;
                turno.paciente = elem.bloques.turnos.paciente;
                turno.profesionales = elem.profesionales;
                turno.organizacion = elem.organizacion;
                turno.espacioFisico = elem.espacioFisico;
                turnos.push(turno);

                /*
                if (req.query.horaInicio) {
                    if ((moment(req.query.horaInicio).format('HH:mm')).toString() === moment(turno.horaInicio).format('HH:mm')) {
                        turnos.push(turno);
                    }
                } else {
                    
                }
                */
            });
            res.json(turnos);
        }
    );

});

export = router;