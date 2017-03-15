import { Auth } from './../../../auth/auth.class';
import * as express from 'express';
import * as agenda from '../schemas/agenda';

let router = express.Router();

router.get('/agenda/:id*?', function (req, res, next) {
    if (req.params.id) {

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

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(req.query.organizacion);
        }

        // Dada una lista de prestaciones, filtra las agendas que tengan al menos una de ellas como prestación
        if (req.query.prestaciones) {
            let arr_prestaciones: any[] = JSON.parse(req.query.prestaciones);
            let variable: any[] = [];
            arr_prestaciones.forEach((prestacion, index) => {

                variable.push({ 'prestaciones._id': prestacion.id })
            });
            query.or(variable);
        }

        // Dada una lista de profesionales, filtra las agendas que tengan al menos uno de ellos
        if (req.query.profesionales) {
            let arr_profesionales: any[] = JSON.parse(req.query.profesionales);
            let variable: any[] = [];
            arr_profesionales.forEach((profesional, index) => {
                variable.push({ 'profesionales._id': profesional.id })
            });
            query.or(variable);
        }

        // Si rango es true  se buscan las agendas que se solapen con la actual en algún punto
        if (req.query.rango) {
            let variable: any[] = [];
            variable.push({ 'horaInicio': { '$lte': req.query.desde }, 'horaFin': { '$gt': req.query.desde } })
            variable.push({ 'horaInicio': { '$lte': req.query.hasta }, 'horaFin': { '$gt': req.query.hasta } })
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
    // Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.put('/agenda/:id', function (req, res, next) {
    agenda.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/agenda/:id', function (req, res, next) {
    agenda.findByIdAndRemove(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

router.patch('/agenda/:id', function (req, res, next) {
    agenda.findById(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        switch (req.body.op) {
            case 'asistenciaTurno': darAsistencia(req, data);
                break;
            case 'liberarTurno': liberarTurno(req, data);
                break;
            case 'bloquearTurno': bloquearTurno(req, data);
                break;
            case 'suspenderTurno': suspenderTurno(req, data);
                break;
            case 'reasignarTurno': reasignarTurno(req, data);
                break;
            case 'guardarNotaTurno': guardarNotaTurno(req, data);
                break;
            case 'editarAgenda': editarAgenda(req, data);
                break;
            case 'suspenderAgenda': suspenderAgenda(req, data);
                break;
            case 'publicarAgenda': publicarAgenda(req, data);
                break;
        }

        data.save(function (err2) {
            if (err) {
                return next(err2);
            }

            return res.json(data);
        });
    });
});

function darAsistencia(req, data) {
    let turno = getTurno(req, data);
    turno.asistencia = !turno.asistencia;
}

function liberarTurno(req, data) {
    let turno = getTurno(req, data);
    turno.estado = 'disponible';
    turno.paciente = {};
    turno.prestacion = null;
}

function bloquearTurno(req, data) {
    let turno = getTurno(req, data);

    if (turno.estado !== 'bloqueado') {
        turno.estado = 'bloqueado';
    } else {
        turno.estado = 'disponible';
    }
}

function suspenderTurno(req, data) {
    let turno = getTurno(req, data);

    turno.estado = 'bloqueado';
    turno.paciente = {};
    turno.prestacion = null;
}

function reasignarTurno(req, data) {
    let turno = getTurno(req, data);

    turno.estado = 'disponible';
    turno.paciente = {};
    turno.prestacion = null;
}

function editarAgenda(req, data) {
    if (req.body.profesional) {
        data.profesionales = req.body.profesional;
    }
    data.espacioFisico = req.body.espacioFisico;
}

function suspenderAgenda(req, data) {
    data.estado = req.body.estado;
}

function publicarAgenda(req, data) {
    data.estado = req.body.estado;
}

function guardarNotaTurno(req, data) {
    let turno = getTurno(req, data);

    turno.nota = req.body.textoNota;
}

function getTurno(req, data) {
    let turno;

    for (let x = 0; x < Object.keys(data).length; x++) {
        if (data.bloques[x] != null) {
            turno = (data as any).bloques[x].turnos.id(req.body.idTurno);
        }
    }

    return turno;
}

export = router;
