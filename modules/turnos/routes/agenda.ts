import * as express from 'express'
import * as agenda from '../schemas/agenda'
import * as utils from '../../../utils/utils';

var router = express.Router();

router.get('/agenda/:id*?', function (req, res, next) {
    if (req.params.id) {

        agenda.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        query = agenda.find({}); //Trae todos

        if (req.query.fechaDesde) {
            query.where('horaInicio').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            query.where('horaFin').lte(req.query.fechaHasta);
        }

        if (req.query.idEspacioFisico) {
            query.where('espacioFisico.id').equals(req.query.idEspacioFisico);
        }

        if (req.query.idProfesional) {
            query.where('profesionales.id').equals(req.query.idProfesional);
        }

        if (req.query.idPrestacion) {
            query.where('prestaciones.id').equals(req.query.idPrestacion);
        }

        //Dada una lista de prestaciones, filtra las agendas que tengan al menos una de las prestaciones
        if (req.query.prestaciones) {
            let arr_prestaciones: any[] = JSON.parse(req.query.prestaciones);
            let variable: any[] = [];
            arr_prestaciones.forEach((prestacion, index) => {
                // console.log ("prestacion "+prestacion._id);
                variable.push({ "prestaciones.id": prestacion._id })
            });
            query.or(variable);
        }

        if (!Object.keys(query).length) {
            res.status(400).send("Debe ingresar al menos un parámetro");
            return next(400);
        }

        query = agenda.find(query).sort({
            fechaDesde: 1,
            fechaHasta: 1
        });

        //console.log("query ", query._conditions)
        query.exec(function (err, data) {
            if (err) return next(err);
            res.json(data);
        });
    }
});


router.post('/agenda', function (req, res, next) {
    var newAgenda = new agenda(req.body);
    newAgenda.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newAgenda);
    })
});

router.put('/agenda/:_id', function (req, res, next) {
    agenda.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


router.patch('/agenda/:_id', function (req, res, next) {
    agenda.findById(req.params._id, function (err, data) {

        switch (req.body.op) {
            case 'asistenciaTurno': data = darAsistencia(req, data);
                break;
            case 'cancelarTurno': data = cancelarAsistencia(req, data);
                break;
            case 'editarAgenda': data = editarAgenda(req, data);
                break;
        }

        data.save(function (err) {
            if (err)
                console.log("Error", err);

            return res.json(data);
        });
    });
});

router.delete('/agenda/:_id', function (req, res, next) {
    agenda.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})


function darAsistencia(req, data) {
    let turno;

    for (let x = 0; x < Object.keys(data).length; x++) {
        if (data.bloques[x] != null) {
            turno = (data as any).bloques[x].turnos.id(req.body.idTurno);
        }
    }

    turno.asistencia = req.body.asistencia;

    return data;
}

function cancelarAsistencia(req, data) {
    let turno;

    for (let x = 0; x < Object.keys(data).length; x++) {
        if (data.bloques[x] != null) {
            turno = (data as any).bloques[x].turnos.id(req.body.idTurno);
        }
    }

    turno.estado = req.body.estado;
    turno.paciente = req.body.paciente;
    turno.prestacion = req.body.prestacion;

    return data;
}

function editarAgenda(req, data) {
    data.profesionales = req.body.profesional;
    data.espacioFisico = req.body.espacioFisico;

    return data;
}

export = router;