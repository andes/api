import { log } from './../../../core/log/schemas/log';
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import { Logger } from '../../../utils/logService';
import { ValidateDarTurno } from '../../../utils/validateDarTurno';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

let router = express.Router();

router.get('/turno/:id*?', function (req, res, next) {

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
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
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
                    console.log(data);
                    return next(err);
                }
                if (data && data.bloques && data.bloques.turnos && data.bloques.turnos >= 0) {
                    res.json(data.bloques.turnos[0]);
                } else {
                    res.json(data);
                }
            });
    } else {
        // Se modifica el pipeline en la posición 0 y 3, que son las posiciones
        // donde se realiza el match
        let matchTurno = {};
        if (req.query.estado) {
            matchTurno['bloques.turnos.estado'] = req.query.estado;
        };

        if (req.query.usuario) {
            matchTurno['updatedBy.username'] = req.query.userName;
            matchTurno['updatedBy.documento'] = req.query.userDoc;
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

        if (req.query.tiposTurno) {
            matchTurno['bloques.turnos.tipoTurno'] = { '$in': req.query.tiposTurno };
        };

        if (req.query.pacienteId) {
            matchTurno['bloques.turnos.paciente.id'] = mongoose.Types.ObjectId(req.query.pacienteId);
        };

        pipelineTurno[0] = { '$match': matchTurno };
        pipelineTurno[3] = { '$match': matchTurno };
        pipelineTurno[6] = { '$unwind': '$bloques' };
        pipelineTurno[7] = { '$unwind': '$bloques.turnos' };
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
        agenda.aggregate(pipelineTurno,
            function (err2, data2) {
                if (err2) {
                    return next(err2);
                }
                data2.forEach(elem => {
                    turno = elem.bloques.turnos;
                    turno.paciente = elem.pacientes_docs.length > 0 ? elem.pacientes_docs[0] : elem.bloques.turnos.paciente;
                    turnos.push(turno);
                });
                res.json(turnos);
            });
    }

});

router.patch('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion

    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body);

    if (continues.valid) {

        // Se verifica la existencia del paciente
        paciente.findById(req.body.paciente.id, function verificarPaciente(err, cant) {
            if (err) {
                console.log('PACIENTE INEXISTENTE', err);
                return next(err);
            } else {

                // Se verifica la existencia del tipoPrestacion
                tipoPrestacion.findById(req.body.tipoPrestacion._id, function verificarTipoPrestacion(err, data) {
                    if (err) {
                        console.log('TIPO PRESTACION INEXISTENTE', err);
                        return next(err);
                    } else {

                        // Se obtiene la agenda que se va a modificar
                        agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
                            if (err) {
                                return next(err);
                            }
                            let posBloque: number;
                            let posTurno: number;

                            // let countBloques = [];
                            let countBloques;
                            let esHoy = false;

                            // Los siguientes 2 for ubican el indice del bloque y del turno
                            for (let x = 0; x < (data as any).bloques.length; x++) {
                                if ((data as any).bloques[x]._id.equals(req.params.idBloque)) {
                                    posBloque = x;

                                    // Ver si el día de la agenda coincide con el día de hoy
                                    if ((data as any).horaInicio >= moment(new Date()).startOf('day').toDate() && (data as any).horaInicio <= moment(new Date()).endOf('day').toDate()) {
                                        esHoy = true;
                                    }

                                    // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
                                    countBloques = {
                                        delDia: esHoy ? (((data as any).bloques[x].accesoDirectoDelDia as number) + ((data as any).bloques[x].accesoDirectoProgramado as number)) : (data as any).bloques[x].accesoDirectoDelDia,
                                        programado: esHoy ? 0 : (data as any).bloques[x].accesoDirectoProgramado,
                                        gestion: (data as any).bloques[x].reservadoGestion,
                                        profesional: (data as any).bloques[x].reservadoProfesional
                                    };

                                    for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
                                        if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                                            posTurno = y;
                                        }

                                        // Restamos los turnos asignados de a cuenta
                                        if ((data as any).bloques[posBloque].turnos[y].estado === 'asignado') {
                                            if (esHoy) {
                                                switch ((data as any).bloques[posBloque].turnos[y].tipoTurno) {
                                                    case ('delDia'):
                                                        // countBloques[x].delDia--;
                                                        countBloques.delDia--;
                                                        break;
                                                    case ('programado'):
                                                        countBloques.delDia--;
                                                        break;
                                                    case ('profesional'):
                                                        countBloques.profesional--;
                                                        break;
                                                    case ('gestion'):
                                                        countBloques.gestion--;
                                                        break;
                                                }
                                            } else {
                                                switch ((data as any).bloques[posBloque].turnos[y].tipoTurno) {
                                                    case ('programado'):
                                                        countBloques.programado--;
                                                        break;
                                                    case ('profesional'):
                                                        countBloques.profesional--;
                                                        break;
                                                    case ('gestion'):
                                                        countBloques.gestion--;
                                                        break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if ((countBloques[req.body.tipoTurno] as number) === 0) {
                                return next({
                                    err: 'No quedan turnos del tipo ' + req.body.tipoTurno
                                });
                            }

                            let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
                            // Copia la organización desde el token
                            usuario.organizacion = (req as any).user.organizacion;

                            let etiquetaTipoTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoTurno';
                            let etiquetaEstado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
                            let etiquetaPaciente: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
                            let etiquetaPrestacion: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';

                            let etiquetaReasignado: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.reasignado';
                            let etiquetaUpdateAt: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedAt';
                            let etiquetaUpdateBy: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedBy';

                            let update: any = {};
                            update[etiquetaEstado] = 'asignado';
                            update[etiquetaPrestacion] = req.body.tipoPrestacion;
                            update[etiquetaPaciente] = req.body.paciente;
                            update[etiquetaTipoTurno] = req.body.tipoTurno;
                            if (req.body.reasignado) {
                                update[etiquetaReasignado] = req.body.reasignado;
                            }
                            update[etiquetaUpdateAt] = new Date();
                            update[etiquetaUpdateBy] = usuario;

                            let query = {
                                _id: req.params.idAgenda,
                            };

                            // Agrega un tag al JSON query
                            query[etiquetaEstado] = 'disponible';

                            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                            (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true },
                                function actualizarAgenda(err2, doc2, writeOpResult) {
                                    if (err2) {
                                        return next(err2);
                                    }
                                    if (writeOpResult && writeOpResult.value === null) {
                                        return next('El turno ya fue asignado');
                                    } else {
                                        let datosOp = {
                                            estado: update[etiquetaEstado],
                                            paciente: update[etiquetaPaciente],
                                            prestacion: update[etiquetaPrestacion],
                                            tipoTurno: update[etiquetaTipoTurno]
                                        };

                                        Logger.log(req, 'turnos', 'asignarTurno', datosOp);
                                    }

                                    res.json(data);
                                });
                        });
                    }
                });

            }
        });
    } else {
        console.log('NO VALIDO');
        return next('Los datos del paciente son inválidos');
    }
});


router.put('/turno/:idTurno/bloque/:idBloque/agenda/:idAgenda/', function (req, res, next) {
    // Al comenzar se chequea que el body contenga el paciente y el tipoPrestacion
    let continues = ValidateDarTurno.checkTurno(req.body.turno);

    if (continues.valid) {
        // Se obtiene la agenda que se va a modificar
        agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
            if (err) {
                return next(err);
            }
            let posBloque: number;
            let posTurno: number;
            // Los siguientes 2 for ubican el indice del bloque y del turno
            for (let x = 0; x < (data as any).bloques.length; x++) {
                if ((data as any).bloques[x]._id.equals(req.params.idBloque)) {
                    posBloque = x;
                    for (let y = 0; y < (data as any).bloques[posBloque].turnos.length; y++) {
                        if ((data as any).bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
                            posTurno = y;
                        }
                    }
                }
            }
            let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
            // Copia la organización desde el token
            usuario.organizacion = (req as any).user.organizacion;

            let etiquetaTurno: string = 'bloques.' + posBloque + '.turnos.' + posTurno;
            let update: any = {};


            console.log('etiquetaTurno', etiquetaTurno);

            update[etiquetaTurno] = req.body.turno;

            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
            (agenda as any).findOneAndUpdate(req.params.idAgenda, update, { new: true },
                function actualizarAgenda(err2, doc2, writeOpResult) {
                    if (err2) {
                        console.log('ERR2: ' + err2);
                        return next(err2);
                    }
                    if (writeOpResult && writeOpResult.value === null) {
                        return next('No se pudo actualizar los datos del turno');
                    } else {
                        let datosOp = {
                            turno: update[etiquetaTurno]
                        };
                        Logger.log(req, 'turnos', 'update', datosOp);
                    }
                    res.json(data);
                });
        });
    } else {
        console.log('NO VALIDO');
        return next('Los datos del paciente son inválidos');
    }
});

export = router;
