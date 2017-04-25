import { Auth } from './../../../auth/auth.class';
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as mongoose from 'mongoose';
import { Logger } from '../../../utils/logService';

let router = express.Router();

router.get('/agenda/paciente/:idPaciente', function (req, res, next) {

    if (req.params.idPaciente) {
        let query = agenda
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
                if ( clon ) {
                    data._id = mongoose.Types.ObjectId();
                    data.isNew = true;
                    let nueva = new agenda(data);
                    let newHoraInicio = combinarFechas(clon, new Date(data['horaInicio']));
                    let newHoraFin = combinarFechas(clon, new Date(data['horaFin']));
                    nueva['horaInicio'] = newHoraInicio;
                    nueva['horaFin'] = newHoraFin;
                    nueva['updatedBy'] = undefined;
                    nueva['updatedAt'] = undefined;
                    let newIniBloque: any;
                    let newFinBloque: any;
                    let newIniTurno: any;
                    nueva['bloques'] = data['bloques'];
                    nueva['bloques'].forEach((bloque, index) => {
                        newIniBloque = combinarFechas(clon, bloque.horaInicio);
                        newFinBloque = combinarFechas(clon, bloque.horaFin);
                        bloque.horaInicio = newIniBloque;
                        bloque.horaFin = newFinBloque;
                        bloque._id = mongoose.Types.ObjectId();
                        bloque.turnos.forEach((turno, index1) => {
                            newIniTurno = combinarFechas(clon, turno.horaInicio);
                            turno.horaInicio = newIniTurno;
                            turno.estado = 'disponible';
                            turno.asistencia = false;
                            turno.paciente = null;
                            turno.tipoPrestacion = null;
                            turno.idPrestacionPaciente = null;
                            turno._id = mongoose.Types.ObjectId();
                            if (turno.tipoTurno) {
                                turno.tipoTurno = undefined;
                            }
                        });
                    });
                    nueva['estado'] = 'Planificacion';
                    Auth.audit(nueva, req);
                    nueva.save((err) => {
                        Logger.log(req, 'turnos', 'insert', {
                            accion: 'Clonar Agenda',
                            ruta: req.url,
                            method: req.method,
                            data: nueva,
                            err: err || false
                        });

                        if (err) {
                            return next(err);
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
                case 'darAsistencia': darAsistencia(req, data, turnos[y]._id);
                    break;
                case 'sacarAsistencia': sacarAsistencia(req, data, turnos[y]._id);
                    break;
                case 'liberarTurno': liberarTurno(req, data, turnos[y]._id);
                    break;
                case 'bloquearTurno': bloquearTurno(req, data, turnos[y]._id);
                    break;
                case 'suspenderTurno': suspenderTurno(req, data, turnos[y]._id);
                    break;
                case 'reasignarTurno': reasignarTurno(req, data, turnos[y]._id);
                    break;
                case 'guardarNotaTurno': guardarNotaTurno(req, data, turnos[y]._id);
                    break;
                case 'editarAgenda': editarAgenda(req, data);
                    break;
                case 'Disponible':
                case 'Publicada': actualizarEstado(req, data);
                    break;
                case 'Pausada':
                case 'prePausada':
                case 'Suspendida': actualizarEstado(req, data);
                    break;
                default:
                    next('Error: No se seleccionó ninguna opción.');
                    break;
            }

            Auth.audit(data, req);

            data.save(function (err) {

                Logger.log(req, 'turnos', 'update', {
                    accion: req.body.op,
                    ruta: req.url,
                    method: req.method,
                    data: data,
                    err: err || false
                });
                if (err) {
                    return next(err);
                }

            });
        }
        return res.json(data);
    });

});

// TODO: Ver si se puede hacer una clase para colocar las siguiente funciones?

// Turno
function darAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    console.log(turno);
    turno.asistencia = true;
}

// Turno
function sacarAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.asistencia = false;
}

// Turno
function liberarTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'disponible';
    delete turno.paciente;
    turno.tipoPrestacion = null;
}

// Turno
function bloquearTurno(req, data, tid = null) {

    let turno = getTurno(req, data, tid);

    if (turno.estado !== 'bloqueado') {
        turno.estado = 'bloqueado';
    } else {
        turno.estado = 'disponible';
    }
}

// Turno
function suspenderTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'bloqueado';
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;
    return data;
}

// Turno
function reasignarTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'disponible';
    delete turno.paciente;
    turno.prestacion = null;
    turno.motivoSuspension = null;
}

// Turno
function guardarNotaTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.nota = req.body.textoNota;
}

// Agenda
function editarAgenda(req, data) {
    if (req.body.profesional) {
        data.profesionales = req.body.profesional;
    }
    data.espacioFisico = req.body.espacioFisico;
}

// Agenda
function actualizarEstado(req, data) {
    // Si se pasa a estado Pausada, guardamos el estado previo
    if (req.body.estado === 'Pausada') {
        data.prePausada = data.estado;
    }
    // Si se pasa a Publicada
    if (req.body.estado === 'Publicada') {
        data.estado = 'Publicada';
        data.bloques.forEach((bloque, index) => {
            bloque.accesoDirectoProgramado = bloque.accesoDirectoProgramado + bloque.reservadoProfesional;
            bloque.reservadoProfesional = 0;
        });
    }
    // Cuando se reanuda de un estado Pausada, se setea el estado guardado en prePausa
    if (req.body.estado === 'prePausada') {
        data.estado = data.prePausada;
    } else {
        data.estado = req.body.estado;
    }
}

// Dada una Agenda completa y un id de Turno, busca y devuelve el Turno completo
function getTurno(req, data, idTurno = null) {
    let turno;
    idTurno = idTurno || req.body.idTurno;
    // Loop en los bloques
    for (let x = 0; x < Object.keys(data).length; x++) {
        // Si existe este bloque...
        if (data.bloques[x] != null) {
            // Buscamos y asignamos el turno con id que coincida (si no coincide "asigna" null)
            turno = (data as any).bloques[x].turnos.id(idTurno);

            // Si encontró el turno dentro de alguno de los bloques, lo devuelve
            if (turno !== null) {
                return turno;
            }
        }
    }
    return false;
}


function combinarFechas(fecha1, fecha2) {
    if (fecha1 && fecha2) {
        let horas: number;
        let minutes: number;
        let auxiliar: Date;

        auxiliar = new Date(fecha1);
        horas = fecha2.getHours();
        minutes = fecha2.getMinutes();
        auxiliar.setHours(horas, minutes, 0, 0);
        return auxiliar;
    } else {
        return null;
    }
}
export = router;
