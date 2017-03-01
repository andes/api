import * as express from 'express'
import { prestacionPaciente } from '../schemas/prestacionPaciente'
import { paciente } from '../../../core/mpi/schemas/paciente'
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';

var router = express.Router();

router.get('/prestaciones/forKey/:key', function (req, res, next) {

    var filtro = "ejecucion.evoluciones.valores." + req.params.key;
    var query = {};
    query[filtro] = {
        $exists: true
    };

    var consulta = prestacionPaciente.find(query).sort({ "ejecucion.fecha": -1 }).limit(1);
    consulta.exec(function (err, data) {
        if (err) {
            next(err);
        };
        //console.log(query);
        res.json(data);
    });
});

router.get('/prestaciones/:id*?', function (req, res, next) {
    var query;
    if (req.params.id) {
        query = prestacionPaciente.findById(req.params.id);
    } else {
        if (req.query.estado) {
            query = prestacionPaciente.find({
                $where: "this.estado[this.estado.length - 1].tipo == '" + req.query.estado + "'"
            })
        } else {
            query = prestacionPaciente.find({}); //Trae todos 
        }

        if (req.query.idTipoPrestacion) {
            query.where('solicitud.tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        }
        if (req.query.idPaciente) {
            query.where('paciente._id').equals(req.query.idPaciente);
        }
        if (req.query.idPrestacionOrigen) {
            query.where('idPrestacionOrigen').equals(req.query.idPrestacionOrigen);
        }

        if (req.query.turnos) {
            let idsTurnos = req.query.turnos.split(",");
            query.where("solicitud.idTurno").in(idsTurnos);
        }
    }

    // populamos todo lo necesario luego del find
    query.populate({
        path: 'solicitud.listaProblemas',
        model: 'problema',
        populate: {
            path: 'tipoProblema',
            model: 'tipoProblema'
        }
    });

    query.populate({
        path: 'solicitud.tipoPrestacion.ejecucion',
        model: 'tipoPrestacion'
    });

    query.populate({
        path: 'prestacionesSolicitadas',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            populate: {
                path: 'tipoProblema',
                model: 'tipoProblema'
            }
        }
    });
    query.populate({
        path: 'prestacionesEjecutadas',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            populate: {
                path: 'tipoProblema',
                model: 'tipoProblema'
            }
        }
    });

    query.sort({ "solicitud.fecha": -1 });

    if (req.query.limit) {
        query.limit(parseInt(req.query.limit));
    }


    query.exec(function (err, data) {
        if (err) {
            next(err);
        };
        //console.log(query);
        res.json(data);
    });
});



router.post('/prestaciones', function (req, res, next) {
    var prestacion;
    prestacion = new prestacionPaciente(req.body);

    paciente.findById(req.body.paciente, function (err, data) {
        if (err) {
            return next(err);
        }

        prestacion.paciente = data;
        prestacion.save((err) => {
            if (err) {
                return next(err);
            }

            res.json(prestacion);
        });

    })
});

router.put('/prestaciones/:id', function (req, res, next) {
    prestacionPaciente.findByIdAndUpdate(req.params.id, req.body, {
        new: true
    }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/prestaciones/:id', function (req, res, next) {
    prestacionPaciente.findByIdAndRemove(req.params.id, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
})

export = router;