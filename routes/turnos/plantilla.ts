import * as express from 'express'
import * as plantilla from '../../schemas/turnos/plantilla'

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
        if (req.query.prestacion) {
            query.where('prestacion.nombre').equals(RegExp('^.*' + req.query.prestacion + '.*$', "i"));
        }
        query.exec((err, data) => {
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
    plantilla.findByIdAndRemove(req.params._id,  req.body, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;