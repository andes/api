import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as agenda from '../../../modules/turnos/schemas/agenda';



export function getTurno(req) {
    return new Promise((resolve, reject) => {
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
                'agenda_id': { $first: '$_id' },
                'organizacion': { $first: '$organizacion' },
                'profesionales': { $first: '$profesionales' },
                'turnos': { $push: '$bloques.turnos' }
            }
        },
        {
            '$group': {
                '_id': '$_id.id',
                'agenda_id': { $first: '$agenda_id' },
                'organizacion': { $first: '$organizacion' },
                'profesionales': { $first: '$profesionales' },
                'bloques': { $push: { '_id': '$_id.bloqueId', 'turnos': '$turnos' } }
            }
        }];
        if (req.params && mongoose.Types.ObjectId.isValid(req.params.id)) {
            let matchId = {
                '$match': {
                    'bloques.turnos._id': mongoose.Types.ObjectId(req.params.id),
                }
            };
            pipelineTurno[0] = matchId;
            pipelineTurno[3] = matchId;

            agenda.aggregate(pipelineTurno,
                function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    if (data && data.bloques && data.bloques.turnos && data.bloques.turnos >= 0) {
                        resolve(data.bloques.turnos[0]);
                    } else {
                        resolve(data);
                    }
                });
        } else {
            // Se modifica el pipeline en la posición 0 y 3, que son las posiciones
            // donde se realiza el match
            let matchTurno = {};
            if (req.query && req.query.estado) {
                matchTurno['bloques.turnos.estado'] = req.query.estado;
            }

            if (req.query && req.query.usuario) {
                matchTurno['updatedBy.username'] = req.query.userName;
                matchTurno['updatedBy.documento'] = req.query.userDoc;
            }

            if (req.query && req.query.asistencia) {
                matchTurno['bloques.turnos.asistencia'] = { '$exists': req.query.asistencia };
            }

            // TODO: probar la siguiente condición
            if (req.query && req.query.codificado) {
                matchTurno['bloques.turnos.diagnosticos.0'] = { '$exists': true };
            }

            if (req.query && req.query.horaInicio) {
                matchTurno['bloques.turnos.horaInicio'] = { '$gte': req.query.horaInicio };
            }

            if (req.query && req.query.tiposTurno) {
                matchTurno['bloques.turnos.tipoTurno'] = { '$in': req.query.tiposTurno };
            }

            if (req.query && req.query.pacienteId) {
                matchTurno['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(req.query.pacienteId);
            }

            pipelineTurno[0] = { '$match': matchTurno };
            pipelineTurno[3] = { '$match': matchTurno };
            pipelineTurno[6] = { '$unwind': '$bloques' };
            pipelineTurno[7] = { '$unwind': '$bloques.turnos' };
            if (req.query && !req.query.pacienteId) {
                pipelineTurno[8] = {
                    '$lookup': {
                        'from': 'paciente',
                        'localField': 'bloques.turnos.paciente.id',
                        'foreignField': '_id',
                        'as': 'pacientes_docs'
                    }
                };
                pipelineTurno[9] = {
                    '$match': { 'pacientes_docs': { $ne: [] } }
                };
            }
            agenda.aggregate(pipelineTurno,
                function (err2, data2) {
                    if (err2) {
                        reject(err2);
                    }
                    data2.forEach(elem => {
                        turno = elem.bloques.turnos;
                        turno.agenda_id = elem.agenda_id;
                        turno.organizacion = elem.organizacion;
                        turno.profesionales = elem.profesionales;
                        turno.paciente = (elem.pacientes_docs && elem.pacientes_docs.length > 0) ? elem.pacientes_docs[0] : elem.bloques.turnos.paciente;
                        turnos.push(turno);
                    });
                    resolve(turnos);
                });
        }
    });

}
