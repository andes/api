import { prestacionPaciente } from './../../rup/schemas/prestacionPaciente';
import { paciente } from './../../../core/mpi/schemas/paciente';
import { Auth } from './../../../auth/auth.class';
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as mongoose from 'mongoose';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';
import * as agendaCtrl from '../controller/agenda';

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

router.get('/agenda/:id*?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        agenda.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    } else {
        let query;
        query = agenda.find({});

        if (req.query.fechaDesde) {
            query.where('horaInicio').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            query.where('horaFin').lte(req.query.fechaHasta);
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
        Logger.log(req, 'turnos', 'insert', {
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

    if (idagenda) {
        agenda.findById(idagenda, function (err, data) {
            if (err) {
                return next(err);
            };
            clones.forEach(clon => {
                clon = new Date(clon);
                if (clon) {
                    data._id = mongoose.Types.ObjectId();
                    data.isNew = true;
                    let nueva = new agenda(data);
                    let newHoraInicio = agendaCtrl.combinarFechas(clon, new Date(data['horaInicio']));
                    let newHoraFin = agendaCtrl.combinarFechas(clon, new Date(data['horaFin']));
                    nueva['horaInicio'] = newHoraInicio;
                    nueva['horaFin'] = newHoraFin;
                    nueva['updatedBy'] = undefined;
                    nueva['updatedAt'] = undefined;
                    nueva['nota'] = null;
                    let newIniBloque: any;
                    let newFinBloque: any;
                    let newIniTurno: any;
                    nueva['bloques'] = data['bloques'];
                    nueva['bloques'].forEach((bloque, index) => {
                        newIniBloque = agendaCtrl.combinarFechas(clon, bloque.horaInicio);
                        newFinBloque = agendaCtrl.combinarFechas(clon, bloque.horaFin);
                        bloque.horaInicio = newIniBloque;
                        bloque.horaFin = newFinBloque;
                        bloque._id = mongoose.Types.ObjectId();
                        bloque.turnos.forEach((turno, index1) => {
                            newIniTurno = agendaCtrl.combinarFechas(clon, turno.horaInicio);
                            turno.horaInicio = newIniTurno;
                            turno.estado = 'disponible';
                            turno.asistencia = undefined;
                            turno.paciente = null;
                            turno.tipoPrestacion = null;
                            turno.idPrestacionPaciente = null;
                            turno.nota = null;
                            turno._id = mongoose.Types.ObjectId();
                            if (turno.tipoTurno) {
                                turno.tipoTurno = undefined;
                            }
                        });
                    });
                    nueva['estado'] = 'planificacion';
                    nueva['sobreturnos'] = [];
                    Auth.audit(nueva, req);
                    nueva.save((err2) => {
                        Logger.log(req, 'turnos', 'insert', {
                            accion: 'Clonar Agenda',
                            ruta: req.url,
                            method: req.method,
                            data: nueva,
                            err: err2 || false
                        });

                        if (err2) {
                            return next(err2);
                        }
                        cloncitos.push(nueva);
                        if (cloncitos.length === clones.length) {
                            res.json(cloncitos);
                        };
                    });
                }
            });
        });
    }
});

router.put('/agenda/:id', function (req, res, next) {
    agenda.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        Logger.log(req, 'turnos', 'update', {
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
            switch (req.body.op) {
                case 'darAsistencia': agendaCtrl.darAsistencia(req, data, turnos[y]._id);
                    break;
                case 'sacarAsistencia': agendaCtrl.sacarAsistencia(req, data, turnos[y]._id);
                    break;
                case 'liberarTurno': agendaCtrl.liberarTurno(req, data, turnos[y]._id);
                    break;
                case 'suspenderTurno': agendaCtrl.suspenderTurno(req, data, turnos[y]._id);
                    break;
                case 'guardarNotaTurno': agendaCtrl.guardarNotaTurno(req, data, turnos[y]._id);
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
                case 'suspendida': agendaCtrl.actualizarEstado(req, data);
                    break;
                // case 'reasignarTurno': reasignarTurno(req, data, turnos[y]._id);
                //     break;
                // case 'bloquearTurno': bloquearTurno(req, data, turnos[y]._id);
                //     break;
                default:
                    next('Error: No se seleccionó ninguna opción.');
                    break;
            }

            Auth.audit(data, req);

            data.save(function (error) {

                Logger.log(req, 'turnos', 'update', {
                    accion: req.body.op,
                    ruta: req.url,
                    method: req.method,
                    data: data,
                    err: error || false
                });
                if (error) {
                    return next(error);
                }

            });
        }
        return res.json(data);
    });

});

// TODO: Ver si se puede hacer una clase para colocar las siguiente funciones?



export = router;
