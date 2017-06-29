import * as express from 'express';
import * as agenda from '../schemas/agenda';
import { Logger } from '../../../utils/logService';
import { ValidateDarTurno } from '../../../utils/validateDarTurno';
import { paciente } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

let router = express.Router();

router.get('/turno/reasignar', function (req, res, next) {
    // Busco la agenda completa que contiene el turno a reasignar
    agenda.findById(req.query.idAgenda, function (err, data) {
        if (err) {
            next(err);
        };
        let resultado = data as any;
        let horaAgendaOrig = new Date();
        horaAgendaOrig.setHours(resultado.horaInicio.getHours(), resultado.horaInicio.getMinutes(), 0, 0)
        let indiceBloque = resultado.bloques.findIndex(y => Object.is(req.query.idBloque, String(y._id)));
        let indiceTurno = resultado.bloques[indiceBloque].turnos.findIndex(y => Object.is(req.query.idTurno, String(y._id)));
        let bloque = resultado.bloques[indiceBloque];
        // turno a reasignar
        let turno = resultado.bloques[indiceBloque].turnos[indiceTurno];
        agenda.aggregate([
            {
                $match:
                {
                    'horaInicio': { '$gte': horaAgendaOrig }, // Que sean agendas futuras
                    '$or': [{ estado: 'disponible' }, { estado: 'publicada' }],
                    'tipoPrestaciones._id': mongoose.Types.ObjectId(turno.tipoPrestacion._id), // Que tengan incluída la prestación del turno
                    '_id': { '$ne': mongoose.Types.ObjectId(req.query.idAgenda) }, // Que no sea la agenda original
                    'bloques.duracionTurno': bloque.duracionTurno // Que al menos un bloque esté configurado con la misma duracion que el turno
                }
            }

        ], function (err1, data1) {
            if (err) {
                return next(err);
            }
            let out = [];
            // verifico que existe un turno con el mismo horario del turno a reasignar y que esté disponible y sin reasignar
            data1.forEach(function (a) {
                a.bloques.forEach(function (b) {
                    b.turnos.forEach(function (t) {
                        let horaIni = moment(t.horaInicio).format('HH:mm');
                        if (horaIni.toString() === moment(turno.horaInicio).format('HH:mm')
                            && t.estado === 'disponible'
                            && b.duracionTurno === bloque.duracionTurno
                            && b.tipoPrestaciones.findIndex(x => String(x._id) === String(turno.tipoPrestacion._id)) >= 0) {
                            out.push(a);
                        }
                    });
                });
            });
            res.json(out);

            // let query = agenda.find({});
            // query.where('_id').ne(req.query.idAgenda);

            // query.where('tipoPrestaciones._id').equals(turno.tipoPrestacion._id);

            // // Filtro las agendas que tengan al menos un bloque con la misma duración del turno
            // query.where('bloques').elemMatch(function (elem) {
            //     elem.where('duracionTurno', bloque.duracionTurno);
            // });

            // query.exec(function (err, data) {
            //     if (err) {
            //         return next(err);
            //     }

            //     res.json(data);
            // });
        });
    });
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
                                        // let esHoy = true;
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
                            let etiquetaUpdateAt: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedAt';
                            let etiquetaUpdateBy: string = 'bloques.' + posBloque + '.turnos.' + posTurno + '.updatedBy';
                            let update: any = {};

                            update[etiquetaEstado] = 'asignado';
                            update[etiquetaPrestacion] = req.body.tipoPrestacion;
                            update[etiquetaPaciente] = req.body.paciente;
                            update[etiquetaTipoTurno] = req.body.tipoTurno;
                            update[etiquetaUpdateAt] = new Date();
                            update[etiquetaUpdateBy] = usuario;

                            let query = {
                                _id: req.params.idAgenda,
                            };

                            // Agrega un tag al JSON query
                            query[etiquetaEstado] = 'disponible';

                            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
                            (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true },
                                function actualizarAgenda(err2, doc2, writeOpResult) {
                                    if (err2) {
                                        return next(err2);
                                    }
                                    if (writeOpResult.value === null) {
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

            update[etiquetaTurno] = req.body.turno;

            let query = {
                _id: req.params.idAgenda,
            };
            // Se hace el update con findOneAndUpdate para garantizar la atomicidad de la operación
            (agenda as any).findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true },
                function actualizarAgenda(err2, doc2, writeOpResult) {
                    if (err2) {
                        console.log('ERR2: ' + err2);
                        return next(err2);
                    }
                    if (writeOpResult.value === null) {
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
