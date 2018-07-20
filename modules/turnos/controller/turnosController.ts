import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import { toArray } from '../../../utils/utils';


export function getTurno(req) {
    return new Promise(async (resolve, reject) => {
        try {
            let pipelineTurno = [];
            let turnos = [];
            let turno;

            pipelineTurno = [{
                '$match': {
                    'estado': 'publicada'
                }
            },
            // Unwind cada array
            { '$unwind': '$bloques' },
            { '$unwind': '$bloques.turnos' },
            // Filtra los elementos que matchean
            {
                '$match': {
                    'estado': 'publicada'
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
                    'bloque_id': { $first: '$_id.bloqueId' },
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

                let data = await toArray(agenda.aggregate(pipelineTurno).cursor({}).exec());

                if (data && data[0].bloques && data[0].bloques.turnos && data[0].bloques.turnos >= 0) {
                    resolve(data[0].bloques.turnos[0]);
                } else {
                    resolve(data);
                }

            } else {
                // Se modifica el pipeline en la posición 0 y 3, que son las posiciones
                // donde se realiza el match
                let matchTurno = {};
                matchTurno['estado'] = 'publicada';
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

                if (req.query && req.query.codificado) {
                    matchTurno['bloques.turnos.diagnosticos.codificaciones.0'] = { '$exists': true };
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
                let data2 = await toArray(agenda.aggregate(pipelineTurno).cursor({}).exec());
                data2.forEach(elem => {
                    turno = elem.bloques.turnos;
                    turno.id = turno._id;
                    turno.agenda_id = elem.agenda_id;
                    turno.bloque_id = elem.bloque_id;
                    turno.organizacion = elem.organizacion;
                    turno.profesionales = elem.profesionales;
                    turno.paciente = (elem.pacientes_docs && elem.pacientes_docs.length > 0) ? elem.pacientes_docs[0] : elem.bloques.turnos.paciente;
                    turnos.push(turno);
                });
                resolve(turnos);
            }
        } catch (error) {
            reject(error);
        }
    });

}


export function getHistorialPaciente(req) {
    return new Promise(async (resolve, reject) => {
        if (req.query && req.query.pacienteId) {
            try {
                let pipelineTurno = [];
                let turnos = [];
                let turno;
                pipelineTurno = [

                    {
                        '$match': {
                            'estado': {
                                '$in': [
                                    'publicada',
                                    'pendienteAsistencia',
                                    'pendienteAuditoria',
                                    'auditada',
                                    'disponible',
                                    'pausada'
                                ]
                            },
                            'bloques.turnos.paciente.id': mongoose.Types.ObjectId(req.query.pacienteId)
                        }
                    },
                    {
                        '$unwind': {
                            'path': '$bloques'
                        }
                    },
                    {
                        '$unwind': {
                            'path': '$bloques.turnos'
                        }
                    },
                    {
                        '$match': {
                            'bloques.turnos.paciente.id': mongoose.Types.ObjectId(req.query.pacienteId)
                        }
                    },
                    {
                        '$group': {
                            '_id': {
                                'id': '$_id',
                                'turnoId': '$bloques.turnos._id'
                            },
                            'agenda_id': {
                                '$first': '$_id'
                            },
                            'organizacion': {
                                '$first': '$organizacion'
                            },
                            'profesionales': {
                                '$first': '$profesionales'
                            },
                            'turno': {
                                '$first': '$bloques.turnos'
                            }
                        }
                    },
                    {
                        '$sort': {
                            'turno.horaInicio': -1.0
                        }
                    }

                ];

                let pipelineSobreturno = [];
                pipelineSobreturno = [

                    {
                        '$match': {
                            'estado': {
                                '$in': [
                                    'publicada',
                                    'pendienteAsistencia',
                                    'pendienteAuditoria',
                                    'auditada',
                                    'disponible',
                                    'pausada'
                                ]
                            },
                            'sobreturnos.paciente.id': mongoose.Types.ObjectId(req.query.pacienteId)
                        }
                    },
                    {
                        '$unwind': {
                            'path': '$sobreturnos'
                        }
                    },
                    {
                        '$match': {
                            'sobreturnos.paciente.id': mongoose.Types.ObjectId(req.query.pacienteId)
                        }
                    },
                    {
                        '$group': {
                            '_id': {
                                'id': '$_id',
                                'turnoId': '$sobreturnos._id'
                            },
                            'agenda_id': {
                                '$first': '$_id'
                            },
                            'organizacion': {
                                '$first': '$organizacion'
                            },
                            'profesionales': {
                                '$first': '$profesionales'
                            },
                            'turno': {
                                '$first': '$sobreturnos'
                            }
                        }
                    },
                    {
                        '$sort': {
                            'turno.horaInicio': -1.0
                        }
                    }

                ];
                let data2 = await agenda.aggregate(pipelineTurno).exec();
                let sobreturnos = await agenda.aggregate(pipelineSobreturno).exec();
                data2 = data2.concat(sobreturnos);
                data2.forEach(elem => {
                    turno = elem.turno;
                    turno.id = turno._id;
                    turno.agenda_id = elem.agenda_id;
                    turno.bloque_id = (elem.bloque) ? elem.bloque_id : null;
                    turno.organizacion = elem.organizacion;
                    turno.profesionales = elem.profesionales;
                    turno.paciente = elem.paciente;
                    turnos.push(turno);
                });
                resolve(turnos);
            } catch (error) {
                reject(error);
            }
        } else {
            reject('Datos insuficientes');
        }
    });

}
