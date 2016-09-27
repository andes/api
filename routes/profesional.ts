import * as express from 'express'
import * as profesional from '../schemas/profesional'
import * as utils from '../utils/utils';

var router = express.Router();

router.get('/profesional/:_id*?', function(req, res, next) {
    if (req.params.id) {
        profesional.findById(req.params._id, function(err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {

        var query;
        var opciones = {};

        if (req.query.nombre) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombre)
            };
        }

        if (req.query.apellido) {
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.apellido)
            };
        }

        if (req.query.documento) {
            opciones['documento'] = utils.makePattern(req.query.documento)
        }

        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento
        }

        if (req.query.numeroMatricula) {
            opciones['matricula.numero'] = req.query.numeroMatricula
        }

        if (req.query.especialidad) {
            opciones['especialidad.nombre'] = {
                '$regex': utils.makePattern(req.query.especialidad)
            };
        }


    }

    query = profesional.find(opciones);

    query.exec(function(err, data) {
        if (err) return next(err);
        res.json(data);
    });

});

router.post('/profesional', function(req, res, next) {
    var newProfesional = new profesional(req.body);
    newProfesional.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newProfesional);
    });
});

router.put('/profesional/:_id', function(req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/profesional/:_id', function(req, res, next) {
    profesional.findByIdAndRemove(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;