import * as mongoose from 'mongoose';
import * as moment from 'moment';
import * as agenda from '../../../modules/turnos/schemas/agenda';
import { toArray } from '../../../utils/utils';
import { logPaciente } from '../../../core/log/schemas/logPaciente';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import * as controller from '../../../core/mpi/controller/paciente';
import { Auth } from './../../../auth/auth.class';
import { paciente as pacienteModel } from '../../../core/mpi/schemas/paciente';

export function getTurno(req) {
    return new Promise(async (resolve, reject) => {
        try {
            let pipelineTurno = [];
            const turnos = [];
            let turno;

            pipelineTurno = [{
                $match: {
                    estado: 'publicada'
                }
            },
            // Unwind cada array
            { $unwind: '$bloques' },
            { $unwind: '$bloques.turnos' },
            // Filtra los elementos que matchean
            {
                $match: {
                    estado: 'publicada'
                }
            },
            {
                $group: {
                    _id: { id: '$_id', bloqueId: '$bloques._id' },
                    agenda_id: { $first: '$_id' },
                    organizacion: { $first: '$organizacion' },
                    profesionales: { $first: '$profesionales' },
                    turnos: { $push: '$bloques.turnos' }
                }
            },
            {
                $group: {
                    _id: '$_id.id',
                    agenda_id: { $first: '$agenda_id' },
                    bloque_id: { $first: '$_id.bloqueId' },
                    organizacion: { $first: '$organizacion' },
                    profesionales: { $first: '$profesionales' },
                    bloques: { $push: { _id: '$_id.bloqueId', turnos: '$turnos' } }
                }
            }];
            // ver llamado, req.query
            if (req.query && mongoose.Types.ObjectId.isValid(req.query.id)) {
                const matchId = {
                    $match: {
                        'bloques.turnos._id': mongoose.Types.ObjectId(req.query.id),
                    }
                };
                pipelineTurno[0] = matchId;
                pipelineTurno[3] = matchId;

                const data = await toArray(agenda.aggregate(pipelineTurno).cursor({}).exec());
                if (data.length > 0 && data[0].bloques && data[0].bloques.turnos && data[0].bloques.turnos >= 0) {
                    resolve(data[0].bloques.turnos[0]);
                } else {
                    resolve(data);
                }

            } else {
                // Se modifica el pipeline en la posición 0 y 3, que son las posiciones
                // donde se realiza el match
                const matchTurno = {};
                matchTurno['estado'] = 'publicada';
                if (req.query && req.query.estado) {
                    matchTurno['bloques.turnos.estado'] = req.query.estado;
                }

                if (req.query && req.query.usuario) {
                    matchTurno['updatedBy.username'] = req.query.userName;
                    matchTurno['updatedBy.documento'] = req.query.userDoc;
                }

                if (req.query && req.query.asistencia) {
                    matchTurno['bloques.turnos.asistencia'] = { $exists: req.query.asistencia };
                }

                if (req.query && req.query.codificado) {
                    matchTurno['bloques.turnos.diagnosticos.codificaciones.0'] = { $exists: true };
                }

                if (req.query && req.query.horaInicio) {
                    matchTurno['bloques.turnos.horaInicio'] = { $gte: req.query.horaInicio };
                }

                if (req.query && req.query.tiposTurno) {
                    matchTurno['bloques.turnos.tipoTurno'] = { $in: req.query.tiposTurno };
                }

                if (req.query && req.query.pacienteId) {
                    const idPaciente = new mongoose.Types.ObjectId(req.query.pacienteId);
                    let { paciente } = await buscarPaciente(idPaciente);
                    matchTurno['bloques.turnos.paciente.id'] = { $in: paciente.vinculos };
                }

                pipelineTurno[0] = { $match: matchTurno };
                pipelineTurno[3] = { $match: matchTurno };
                pipelineTurno[6] = { $unwind: '$bloques' };
                pipelineTurno[7] = { $unwind: '$bloques.turnos' };
                if (req.query && !req.query.pacienteId) {
                    pipelineTurno[8] = {
                        $lookup: {
                            from: 'paciente',
                            localField: 'bloques.turnos.paciente.id',
                            foreignField: '_id',
                            as: 'pacientes_docs'
                        }
                    };
                    pipelineTurno[9] = {
                        $match: { pacientes_docs: { $ne: [] } }
                    };
                }
                const data2 = await toArray(agenda.aggregate(pipelineTurno).cursor({}).exec());
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


export async function getHistorialPaciente(req) {
    if (req.query && req.query.pacienteId) {
        const idPaciente = new mongoose.Types.ObjectId(req.query.pacienteId);
        let { paciente } = await buscarPaciente(idPaciente);
        try {
            let pipelineTurno = [];
            let pipelineSobreturno = [];
            if (req.query.turnosProximos) {
                pipelineTurno.push({ $match: { horaInicio: { $gte: moment().startOf('day').toDate() } } });
                pipelineSobreturno.push({ $match: { horaInicio: { $gte: moment().startOf('day').toDate() } } });
            }
            if (req.query.organizacion) {
                pipelineTurno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
                pipelineSobreturno.push({ $match: { 'organizacion._id': { $eq: new mongoose.Types.ObjectId(Auth.getOrganization(req)) } } });
            }
            if (req.query.conceptId) {
                pipelineTurno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
                pipelineSobreturno.push({ $match: { 'tipoPrestaciones.conceptId': req.query.conceptId } });
            }
            const turnos = [];
            let turno;
            pipelineTurno.push(

                {
                    $match: {
                        estado: {
                            $in: [
                                'publicada',
                                'pendienteAsistencia',
                                'pendienteAuditoria',
                                'auditada',
                                'disponible',
                                'pausada'
                            ]
                        },
                        'bloques.turnos.paciente.id': { $in: paciente.vinculos }
                    }
                },
                {
                    $unwind: {
                        path: '$bloques'
                    }
                },
                {
                    $unwind: {
                        path: '$bloques.turnos'
                    }
                },
                {
                    $match: {
                        'bloques.turnos.paciente.id': { $in: paciente.vinculos }
                    }
                },
                {
                    $group: {
                        _id: {
                            id: '$_id',
                            turnoId: '$bloques.turnos._id'
                        },
                        agenda_id: {
                            $first: '$_id'
                        },
                        bloque_id: { $first: '$bloques._id' },
                        organizacion: {
                            $first: '$organizacion'
                        },
                        profesionales: {
                            $first: '$profesionales'
                        },
                        turno: {
                            $first: '$bloques.turnos'
                        },
                        espacioFisico: {
                            $first: '$espacioFisico'
                        }
                    }
                },
                {
                    $sort: {
                        'turno.horaInicio': -1.0
                    }
                }
            );
            pipelineSobreturno.push(

                {
                    $match: {
                        estado: {
                            $in: [
                                'publicada',
                                'pendienteAsistencia',
                                'pendienteAuditoria',
                                'auditada',
                                'disponible',
                                'pausada'
                            ]
                        },
                        'sobreturnos.paciente.id': { $in: paciente.vinculos }
                    }
                },
                {
                    $unwind: {
                        path: '$sobreturnos'
                    }
                },
                {
                    $match: {
                        'sobreturnos.paciente.id': { $in: paciente.vinculos }
                    }
                },
                {
                    $group: {
                        _id: {
                            id: '$_id',
                            turnoId: '$sobreturnos._id'
                        },
                        agenda_id: {
                            $first: '$_id'
                        },
                        organizacion: {
                            $first: '$organizacion'
                        },
                        profesionales: {
                            $first: '$profesionales'
                        },
                        turno: {
                            $first: '$sobreturnos'
                        },
                        espacioFisico: {
                            $first: '$espacioFisico'
                        }
                    }
                },
                {
                    $sort: {
                        'turno.horaInicio': -1.0
                    }
                }

            );
            let data2 = await agenda.aggregate(pipelineTurno).exec();
            const sobreturnos = await agenda.aggregate(pipelineSobreturno).exec();
            data2 = data2.concat(sobreturnos);
            data2.forEach(elem => {
                turno = elem.turno;
                turno.id = turno._id;
                turno.agenda_id = elem.agenda_id;
                turno.bloque_id = (elem.bloque_id) ? elem.bloque_id : null;
                turno.organizacion = elem.organizacion;
                turno.profesionales = elem.profesionales;
                turno.paciente = elem.turno.paciente;
                turno.espacioFisico = elem.espacioFisico;
                turnos.push(turno);
            });
            return (turnos);
        } catch (error) {
            return (error);
        }
    } else {
        return ('Datos insuficientes');
    }

}

export async function getLiberadosPaciente(req) {
    if (req.query && req.query.pacienteId) {
        try {
            const idPaciente = new mongoose.Types.ObjectId(req.query.pacienteId);
            let { paciente } = await buscarPaciente(idPaciente);
            const resultado: any = await logPaciente.find(
                {
                    paciente: { $in: paciente.vinculos },
                    operacion: 'turnos:liberar',
                    'dataTurno.turno.updatedBy.organizacion._id': req.user.organizacion._id
                })
                .exec();
            let turno;
            const turnos = [];
            resultado.forEach(elem => {
                turno = elem.dataTurno.turno.toObject();
                turno.id = elem.dataTurno.turno._id;
                turno.agenda_id = elem.dataTurno.idAgenda;
                turno.bloque_id = elem.dataTurno.idBloque;
                turno.organizacion = elem.dataTurno.turno.updatedBy.organizacion;
                turno.profesionales = elem.dataTurno.profesionales;
                turno.estado = 'liberado';
                turnos.push(turno);
            });
            return turnos;
        } catch (error) {
            return (error);
        }
    } else {
        return ('Datos insuficientes');
    }
}

/**
 *
 *
 * @export
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @param {*} pacienteMPI
 * @returns
 */
export async function actualizarCarpeta(req: any, res: any, next: any, pacienteMPI: any, carpetas) {
    let carpetasAux = (carpetas && carpetas.length > 0) ? (carpetas[0] as any).carpetaEfectores : [];
    if (pacienteMPI) {
        if (pacienteMPI.paciente.carpetaEfectores.length > 0) {
            if (carpetasAux.length < pacienteMPI.paciente.carpetaEfectores.length) {
                req.body.carpetaEfectores = pacienteMPI.paciente.carpetaEfectores;
            } else {
                if (carpetasAux) {
                    req.body.carpetaEfectores = carpetasAux;
                }
            }
        } else {
            if (carpetas.length > 0) {
                req.body.carpetaEfectores = carpetasAux;
            }
        }
        const repetida = await controller.checkCarpeta(req, pacienteMPI.paciente);
        if (!repetida) {
            controller.updateCarpetaEfectores(req, pacienteMPI.paciente);
            // controller.updateTurnosPaciente(pacienteMPI.paciente);
        } else {
            return next('El nÚmero de carpeta ya existe');
        }
        let pacienteAndes: any;
        if (pacienteMPI.db === 'mpi') {
            pacienteAndes = new pacienteModel(pacienteMPI.paciente.toObject());
        } else {
            pacienteAndes = pacienteMPI.paciente;
        }
        Auth.audit(pacienteAndes, req);
        await pacienteAndes.save();
    }
}
