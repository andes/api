
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';
import * as agendaCtrl from '../controller/agenda';
import { LoggerPaciente } from '../../../utils/loggerPaciente';


let router = express.Router();

router.get('/agenda/paciente/:idPaciente', function (req, res, next) {

    if (req.params.idPaciente) {
        agenda
            .find({ 'bloques.turnos.paciente.id': req.params.idPaciente })
            .limit(10)
            .sort({ horaInicio: -1 })
            .exec(function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json(data);
            });
    }

});


router.get('/agenda/candidatas', function (req, res, next) {
    agenda.findById(req.query.idAgenda, function (err, data) {
        if (err) {
            return next(err);
        }

        let resultado = data as any;
        let horaAgendaOrig = new Date();
        horaAgendaOrig.setHours(0, 0, 0, 0);

        let indiceBloque = resultado.bloques.findIndex(y => Object.is(req.query.idBloque, String(y._id)));
        let indiceTurno = resultado.bloques[indiceBloque].turnos.findIndex(y => Object.is(req.query.idTurno, String(y._id)));
        let bloque = resultado.bloques[indiceBloque];

        // turno a reasignar
        let turno = resultado.bloques[indiceBloque].turnos[indiceTurno];

        let match = {
            'organizacion._id': { '$eq': mongoose.Types.ObjectId(Auth.getOrganization(req)) }, // Que sean agendas de la misma organizacion
            'horaInicio': { '$gte': horaAgendaOrig },
            'nominalizada': true,
            '$or': [{ estado: 'disponible' }, { estado: 'publicada' }],
            'tipoPrestaciones._id': turno.tipoPrestacion ? mongoose.Types.ObjectId(turno.tipoPrestacion.id) : '', // Que tengan incluída la prestación del turno
            '_id': { '$ne': mongoose.Types.ObjectId(req.query.idAgenda) }, // Que no sea la agenda original
        };

        if (req.query.duracion) {
            match['bloques.duracionTurno'] = bloque.duracionTurno;
        }

        agenda.aggregate([
            {
                $match: match
            }

        ], function (err1, data1) {

            if (err) {
                return next(err);
            }

            let out = [];

            // Verifico que existe un turno disponible o ya reasignado para el mismo tipo de prestación del turno
            data1.forEach(function (a, indiceA) {
                a.bloques.forEach(function (b, indiceB) {
                    b.turnos.forEach(function (t, indiceT) {
                        let horaIni = moment(t.horaInicio).format('HH:mm');
                        if (
                            b.tipoPrestaciones.findIndex(x => String(x._id) === String(turno.tipoPrestacion.id)) >= 0
                            &&  // mismo tipo de prestacion
                            (t.estado === 'disponible' || (t.estado === 'asignado' && typeof t.reasignado !== 'undefined' && t.reasignado.anterior && t.reasignado.anterior.idTurno === req.query.idTurno))
                            &&  // turno disponible o al que se reasigno
                            (typeof req.query.horario !== 'undefined' ? horaIni.toString() === moment(turno.horaInicio).format('HH:mm') : true)
                            && // si filtro por horario verifico que sea el mismo
                            (req.query.duracion ? b.duracionTurno === bloque.duracionTurno : true)
                            &&  // si filtro por duracion verifico que sea la mismo
                            (bloque.accesoDirectoDelDia > 0 && b.restantesDelDia > 0) || (bloque.accesoDirectoProgramado > 0 && b.restantesProgramados > 0) // verifico que queden turnos disponibles
                            // && //
                            // (bloque.turnos.map(t => t.paciente && t.paciente.id).length)
                        ) {
                            if (out.indexOf(a) < 0) {
                                out.push(a);
                            }
                        }
                    });
                });
            });

            let sortCandidatas = function (a, b) {
                return a.horaInicio - b.horaInicio;
            };

            out.sort(sortCandidatas);
            res.json(out);

        });
    });
});

router.get('/agenda/:id?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        agenda.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = agenda.find({});

        query.where('estado').ne('borrada'); // No devuelve agendas borradas

        if (req.query.fechaDesde) {
            query.where('horaInicio').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            query.where('horaFin').lte(moment(req.query.fechaHasta).endOf('day'));
        }

        if (req.query.idProfesional) {
            query.where('profesionales._id').equals(req.query.idProfesional);
        }

        if (req.query.idTipoPrestacion) {
            query.where('tipoPrestaciones._id').equals(req.query.idTipoPrestacion);
        }

        if (req.query.espacioFisico) {
            query.where('espacioFisico._id').equals(req.query.espacioFisico);
        }

        if (req.query.estado) {
            query.where('estado').equals(req.query.estado);
        }

        if (req.query.estados) {
            query.where('estado').in(req.query.estados);
        }

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(req.query.organizacion);
        }

        // Trae las Agendas NO nominalizadas
        if (req.query.nominalizada && req.query.nominalizada === false) {
            query.where('nominalizada').equals(false);
        }

        // Filtra por el array de tipoPrestacion enviado como parametro
        if (req.query.tipoPrestaciones) {
            query.where('tipoPrestaciones._id').in(req.query.tipoPrestaciones);
        }

        // Dada una lista de prestaciones, filtra las agendas que tengan al menos una de ellas como prestación
        if (req.query.prestaciones) {
            let arr_prestaciones: any[] = JSON.parse(req.query.prestaciones);
            let variable: any[] = [];
            arr_prestaciones.forEach((prestacion, index) => {
                variable.push({ 'prestaciones._id': prestacion.id });
            });
            query.or(variable);
        }

        if (req.query.profesionales) {
            query.where('profesionales._id').in(req.query.profesionales);
        }

        if (req.query.tieneTurnosAsignados) {
            query.where('bloques.turnos.estado').equals('asignado');
        }

        // Si rango es true  se buscan las agendas que se solapen con la actual en algún punto
        if (req.query.rango) {
            let variable: any[] = [];
            variable.push({ 'horaInicio': { '$lte': req.query.desde }, 'horaFin': { '$gt': req.query.desde } });
            variable.push({ 'horaInicio': { '$lte': req.query.hasta }, 'horaFin': { '$gt': req.query.hasta } });
            variable.push({ 'horaInicio': { '$gt': req.query.desde, '$lte': req.query.hasta } });
            query.or(variable);
        }

        if (!Object.keys(query).length) {
            res.status(400).send('Debe ingresar al menos un parámetro');
            return next(400);
        }


        query.sort({ 'horaInicio': 1 });

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.post('/agenda', function (req, res, next) {
    let data = new agenda(req.body);
    Auth.audit(data, req);
    data.save((err) => {
        Logger.log(req, 'citas', 'insert', {
            accion: 'Crear Agenda',
            ruta: req.url,
            method: req.method,
            data: data,
            err: err || false
        });
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


// Este post recibe el id de la agenda a clonar y un array con las fechas en las cuales se va a clonar
router.post('/agenda/clonar', function (req, res, next) {
    let idagenda = req.body.idAgenda;
    let clones = req.body.clones;
    let cloncitos = [];
    let listaSaveAgenda = [];

    if (idagenda) {
        agenda.findById(idagenda, function (err, data) {
            if (err) {
                return next(err);
            }
            clones.forEach(clon => {
                clon = new Date(clon);
                if (clon) {
                    data._id = mongoose.Types.ObjectId();
                    data.isNew = true;
                    let nueva = new agenda(data.toObject());
                    nueva['horaInicio'] = agendaCtrl.combinarFechas(clon, new Date(data['horaInicio']));
                    nueva['horaFin'] = agendaCtrl.combinarFechas(clon, new Date(data['horaFin']));
                    nueva['updatedBy'] = undefined;
                    nueva['updatedAt'] = undefined;
                    nueva['nota'] = null;
                    let newIniBloque: any;
                    let newFinBloque: any;
                    let newIniTurno: any;
                    // nueva['bloques'] = data['bloques'];
                    nueva['bloques'].forEach((bloque, index) => {
                        bloque.horaInicio = agendaCtrl.combinarFechas(clon, bloque.horaInicio);
                        bloque.horaFin = agendaCtrl.combinarFechas(clon, bloque.horaFin);
                        if (bloque.pacienteSimultaneos) {
                            bloque.restantesDelDia = bloque.accesoDirectoDelDia * bloque.cantidadSimultaneos;
                            bloque.restantesProgramados = bloque.accesoDirectoProgramado * bloque.cantidadSimultaneos;
                            bloque.restantesGestion = bloque.reservadoGestion * bloque.cantidadSimultaneos;
                            bloque.restantesProfesional = bloque.reservadoProfesional * bloque.cantidadSimultaneos;
                        } else {
                            bloque.restantesDelDia = bloque.accesoDirectoDelDia;
                            bloque.restantesProgramados = bloque.accesoDirectoProgramado;
                            bloque.restantesGestion = bloque.reservadoGestion;
                            bloque.restantesProfesional = bloque.reservadoProfesional;
                        }
                        bloque._id = mongoose.Types.ObjectId();
                        bloque.turnos.forEach((turno, index1) => {
                            turno.horaInicio = agendaCtrl.combinarFechas(clon, turno.horaInicio);
                            turno.estado = 'disponible';
                            turno.asistencia = undefined;
                            turno.paciente = null;
                            turno.tipoPrestacion = null;
                            turno.idPrestacionPaciente = null;
                            turno.nota = null;
                            turno._id = mongoose.Types.ObjectId();
                            turno.tipoTurno = undefined;
                        });
                    });
                    nueva['estado'] = 'planificacion';
                    nueva['sobreturnos'] = [];
                    Auth.audit(nueva, req);
                    listaSaveAgenda.push(
                        agendaCtrl.saveAgenda(nueva).then((nuevaAgenda) => {
                            Logger.log(req, 'citas', 'insert', {
                                accion: 'Clonar Agenda',
                                ruta: req.url,
                                method: req.method,
                                data: nuevaAgenda,
                                err: err || false
                            });
                        }).catch(error => {
                            return (error);
                        })
                    );
                }
            });
            Promise.all(listaSaveAgenda).then(resultado => {
                res.json(resultado);
            });
        });
    }
});

router.put('/agenda/:id', function (req, res, next) {
    agenda.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        Logger.log(req, 'citas', 'update', {
            accion: 'Editar Agenda en estado Planificación',
            ruta: req.url,
            method: req.method,
            data: data,
            err: err || false
        });
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/agenda/:id*?', function (req, res, next) {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return next('ObjectID Inválido');
    }

    agenda.findById(req.params.id, function (err, data) {

        if (err) {
            return next(err);
        }

        // Loopear los turnos, si viene vacío, es porque viene un id solo
        let turnos = req.body.turnos || [''];

        for (let y = 0; y < turnos.length; y++) {
            let turno;
            switch (req.body.op) {
                case 'darAsistencia': agendaCtrl.darAsistencia(req, data, turnos[y]._id);
                    break;
                case 'sacarAsistencia': agendaCtrl.sacarAsistencia(req, data, turnos[y]._id);
                    break;
                case 'quitarTurnoDoble': agendaCtrl.quitarTurnoDoble(req, data, turnos[y]._id);
                    break;
                case 'liberarTurno':
                    turno = agendaCtrl.getTurno(req, data, turnos[y]._id);
                    if (turno.paciente.id) {
                        LoggerPaciente.logTurno(req, 'turnos:liberar', turno.paciente, turno, agendaCtrl.getBloque(data, turno)._id, data._id);
                    }
                    agendaCtrl.liberarTurno(req, data, turno);
                    break;
                case 'suspenderTurno':
                    turno = agendaCtrl.getTurno(req, data, turnos[y]._id);
                    LoggerPaciente.logTurno(req, 'turnos:suspender', (turno.paciente ? turno.paciente : null), turno, agendaCtrl.getBloque(data, turno)._id, data._id);
                    agendaCtrl.suspenderTurno(req, data, turno);
                    break;
                case 'guardarNotaTurno': agendaCtrl.guardarNotaTurno(req, data, req.body.idTurno);
                    break;
                case 'darTurnoDoble': agendaCtrl.darTurnoDoble(req, data, turnos[y]._id);
                    break;
                case 'notaAgenda': agendaCtrl.guardarNotaAgenda(req, data);
                    break;
                case 'editarAgenda': agendaCtrl.editarAgenda(req, data);
                    break;
                case 'agregarSobreturno': agendaCtrl.agregarSobreturno(req, data);
                    break;
                case 'disponible':
                case 'publicada': agendaCtrl.actualizarEstado(req, data);
                    break;
                case 'pausada':
                case 'prePausada':
                case 'asistenciaCerrada':
                case 'codificada':
                case 'suspendida':
                case 'borrada':
                    agendaCtrl.actualizarEstado(req, data);
                    break;
                case 'avisos':
                    agendaCtrl.agregarAviso(req, data);
                    break;
                // case 'reasignarTurno': reasignarTurno(req, data, turnos[y]._id);
                //     break;
                // case 'bloquearTurno': bloquearTurno(req, data, turnos[y]._id);
                //     break;

                default:
                    return next('Error: No se seleccionó ninguna opción.');
            }

            Auth.audit(data, req);

            data.save(function (error) {

                Logger.log(req, 'citas', 'update', {
                    accion: req.body.op,
                    ruta: req.url,
                    method: req.method,
                    data: data,
                    err: error || false
                });
                if (error) {
                    return next(error);
                }

                if (req.body.op === 'suspendida') {
                    (data as any).bloques.forEach(bloque => {

                        // Loggear cada turno
                        bloque.turnos.forEach(t => {
                            if (t.paciente && t.paciente.id) {
                                LoggerPaciente.logTurno(req, 'turnos:suspender', t.paciente, t, bloque._id, data._id);
                            }
                        });

                    });
                }
            });

        }
        return res.json(data);
    });

});

export = router;
