import { prestacionPaciente } from './../../rup/schemas/prestacionPaciente';
import { paciente } from './../../../core/mpi/schemas/paciente';
import { Auth } from './../../../auth/auth.class';
import * as express from 'express';
import * as agenda from '../schemas/agenda';
import * as mongoose from 'mongoose';
import { Logger } from '../../../utils/logService';
import * as moment from 'moment';

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
                    let newHoraInicio = combinarFechas(clon, new Date(data['horaInicio']));
                    let newHoraFin = combinarFechas(clon, new Date(data['horaFin']));
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
                        newIniBloque = combinarFechas(clon, bloque.horaInicio);
                        newFinBloque = combinarFechas(clon, bloque.horaFin);
                        bloque.horaInicio = newIniBloque;
                        bloque.horaFin = newFinBloque;
                        bloque._id = mongoose.Types.ObjectId();
                        bloque.turnos.forEach((turno, index1) => {
                            newIniTurno = combinarFechas(clon, turno.horaInicio);
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
                case 'darTurnoDoble': darTurnoDoble(req, data, turnos[y]._id);
                    break;
                case 'notaAgenda': guardarNotaAgenda(req, data);
                    break;
                case 'editarAgenda': editarAgenda(req, data);
                    break;
                case 'agregarSobreturno': agregarSobreturno(req, data);
                    break;
                case 'disponible':
                case 'publicada': actualizarEstado(req, data);
                    break;
                case 'pausada':
                case 'prePausada':
                case 'suspendida': actualizarEstado(req, data);
                    break;
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

// Turno
function darAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.asistencia = 'asistio';
    // crearPrestacionVacia(turno, req);
}

// Turno
function sacarAsistencia(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.asistencia = undefined;
}

// Turno
function liberarTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'disponible';
    // delete turno.paciente;
    turno.paciente = null;
    turno.tipoPrestacion = null;
    turno.nota = null;

    let turnoDoble = getTurnoSiguiente(req, data, tid);
    if (turnoDoble) {
        turnoDoble.estado = 'disponible';
    }
}

// Turno
function bloquearTurno(req, data, tid = null) {

    let turno = getTurno(req, data, tid);

    if (turno.estado !== 'suspendido') {
        turno.estado = 'suspendido';
    } else {
        turno.estado = 'disponible';
    }
}

// Turno
function suspenderTurno(req, data, tid = null) {
    let turno = getTurno(req, data, tid);
    turno.estado = 'suspendido';
    delete turno.paciente;
    delete turno.tipoPrestacion;
    turno.motivoSuspension = req.body.motivoSuspension;
    // Se verifica si tiene un turno doble asociado
    let turnoDoble = getTurnoSiguiente(req, data, tid);
    if (turnoDoble) {
        turnoDoble.estado = 'suspendido';
        turnoDoble.motivoSuspension = req.body.motivoSuspension;
    }
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

// Turno
function darTurnoDoble(req, data, tid = null) {   //NUEVO
    let position = getPosition(req, data, tid);
    let agenda = data;
    if ((position.indexBloque > -1) && (position.indexTurno > -1)) {
        let turnoAnterior = agenda.bloques[position.indexBloque].turnos[position.indexTurno];

        // Verifico si existen turnos disponibles del tipo correspondiente
        let countBloques = calcularContadoresTipoTurno(position.indexBloque, position.indexTurno, agenda);
        if ((countBloques[turnoAnterior.tipoTurno] as number) === 0) {
            return ({
                err: 'No se puede asignar el turno doble ' + req.body.tipoTurno
            });
        } else {
            // se controla la disponibilidad de los tipos de turnos
            // el turno doble se otorgarpa si existe disponibilidad de la cantidad de tipo del turno asociado
            let turno = getTurno(req, data, tid);
            turno.estado = 'turnoDoble';
        }

    } else {
        return ({
            err: 'No se puede asignar el turno doble'
        });
    }

}

// Agenda
function guardarNotaAgenda(req, data) {
    data.nota = req.body.nota;
}

// Agenda
function editarAgenda(req, data) {
    if (req.body.profesional) {
        data.profesionales = req.body.profesional;
    }
    data.espacioFisico = req.body.espacioFisico;
}

// Agenda
function agregarSobreturno(req, data) {
    let sobreturno = req.body.sobreturno;
    if (sobreturno) {
        let usuario = (Object as any).assign({}, (req as any).user.usuario || (req as any).user.app);
        // Copia la organización desde el token
        usuario.organizacion = (req as any).user.organizacion;
        sobreturno.updatedAt = new Date();
        sobreturno.updatedBy = usuario;
        data.sobreturnos.push(sobreturno);
    }
}

// Agenda
function actualizarEstado(req, data) {
    // Si se pasa a estado Pausada, guardamos el estado previo
    if (req.body.estado === 'pausada') {
        data.prePausada = data.estado;
    }
    // Si se pasa a publicada
    if (req.body.estado === 'publicada') {
        data.estado = 'publicada';
        data.bloques.forEach((bloque, index) => {
            bloque.accesoDirectoProgramado = bloque.accesoDirectoProgramado + bloque.reservadoProfesional;
            bloque.reservadoProfesional = 0;
        });
    }
    // Cuando se reanuda de un estado pausada, se setea el estado guardado en prePausa
    if (req.body.estado === 'prePausada') {
        data.estado = data.prePausada;
    } else {
        data.estado = req.body.estado;
    }
}

// Dada una Agenda completa + un id de Turno, busca y devuelve el Turno completo
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
    // sobreturnos
    turno = data.sobreturnos.id(idTurno);
    if (turno !== null) {
        return turno;
    }
    return false;
}

function getPosition(req, agenda, idTurno = null) {
    idTurno = idTurno || req.body.idTurno;
    let index = -1;
    let turnos;
    let position = { indexBloque: -1, indexTurno: -1 };
    // Loop en los bloques
    for (let x = 0; x < agenda.bloques.length; x++) {
        // Si existe este bloque...
        turnos = agenda.bloques[x].turnos;
        index = turnos.findIndex((t) => { return t._id.toString() === idTurno.toString(); });
        if (index > -1) {
            position.indexBloque = x;
            position.indexTurno = index;
        }
    }
    return position;
}


function getTurnoSiguiente(req, agenda, idTurno = null) {
    let position = getPosition(req, agenda, idTurno = null);
    let index = position.indexTurno;
    let turnos = [];
    if (position.indexBloque > -1) {
        turnos = agenda.bloques[position.indexBloque].turnos;
    }
    if ((index > -1) && (index < turnos.length - 1) && (turnos[index + 1].estado === 'turnoDoble')) {
        return turnos[index + 1];
    }
    return null;
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

function calcularContadoresTipoTurno(posBloque, posTurno, agenda) {
    // Los siguientes 2 for ubican el indice del bloque y del turno
    let countBloques;
    let esHoy = false;
    // Ver si el día de la agenda coincide con el día de hoy
    if (agenda.horaInicio >= moment(new Date()).startOf('day').toDate() && agenda.horaInicio <= moment(new Date()).endOf('day').toDate()) {
        esHoy = true;
    }

    // Contadores de "delDia" y "programado" varían según si es el día de hoy o no
    countBloques = {
        delDia: esHoy ? ((agenda.bloques[posBloque].accesoDirectoDelDia as number) + (agenda.bloques[posBloque].accesoDirectoProgramado as number)) : agenda.bloques[posBloque].accesoDirectoDelDia,
        programado: esHoy ? 0 : agenda.bloques[posBloque].accesoDirectoProgramado,
        gestion: agenda.bloques[posBloque].reservadoGestion,
        profesional: agenda.bloques[posBloque].reservadoProfesional
    };

    // Restamos los turnos asignados de a cuenta
    if (agenda.bloques[posBloque].turnos[posTurno].estado === 'asignado') {
        if (esHoy) {
            switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
                case ('delDia'):
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
            switch (agenda.bloques[posBloque].turnos[posTurno].tipoTurno) {
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
    return countBloques;
}

// Dado un turno, se crea una prestacionPaciente
function crearPrestacionVacia(turno, req) {
    let prestacion;
    let nuevaPrestacion;
    let pacienteTurno = turno.paciente;

    pacienteTurno['_id'] = turno.paciente.id;
    paciente.findById(pacienteTurno.id, (err, data) => {
        nuevaPrestacion = {
            paciente: data,
            solicitud: {
                tipoPrestacion: turno.tipoPrestacion,
                fecha: new Date(),
                listaProblemas: [],
                idTurno: turno.id,
            },
            estado: {
                timestamp: new Date(),
                tipo: 'pendiente'
            },
            ejecucion: {
                fecha: new Date(),
                evoluciones: []
            }
        };
        prestacion = new prestacionPaciente(nuevaPrestacion);

        Auth.audit(prestacion, req);
        prestacion.save();
    });
}

export = router;
