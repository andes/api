import * as express from 'express'
import * as plantilla from '../../schemas/turnos/plantilla'
import * as utils from '../../utils/utils';

var router = express.Router();

router.get('/plantilla/:id*?', function (req, res, next) {
    if (req.params.id) {

        plantilla.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        query = plantilla.find({}); //Trae todos

        if (req.query.fechaDesde) {
            console.log(req.query.fechaDesde);
            query.where('horaInicio').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            console.log(req.query.fechaHasta);
            query.where('horaFin').lte(req.query.fechaHasta);
        }

        if (req.query.idEspacioFisico) {
            query.where('espacioFisico.id').equals(req.query.idEspacioFisico);
        }

        if (req.query.idProfesional) {
            query.where('profesionales.id').equals(req.query.idProfesional);
        }

        // if (req.query.idPrestacion) {
        //     query.where('prestaciones.id').equals(req.query.idPrestacion);
        // }

        // if (req.query.nombre) {
        //     query.where('profesionales.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        // }

        if (!Object.keys(query).length) {
            res.status(400).send("Debe ingresar al menos un parámetro");
            return next(400);
        }

        query = plantilla.find(query).sort({
            fechaDesde: 1,
            fechaHasta: 1
        });

        query.exec(function (err, data) {
            if (err) return next(err);
            res.json(data);
        });

    }

});


router.post('/plantilla', function (req, res, next) {
    var newPlantilla = new plantilla(req.body)
    newPlantilla.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newPlantilla);
    })
    console.log(newPlantilla);
});

router.put('/plantilla/:_id', function (req, res, next) {
    plantilla.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/plantilla/:_id', function (req, res, next) {
    plantilla.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;