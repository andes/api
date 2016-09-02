import * as express from 'express'
import * as especialidad from '../schemas/especialidad'

var router = express.Router();

router.get('/especialidad', function(req, res, next) {
    especialidad.find({}, (err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});

router.get('/especialidad/:id', function(req, res, next) {
    especialidad.findOne({
        _id: req.params.id
    }, (err, data) => {
        if (err) {
            next(err);
        };
        res.json(data);
    });
});

router.post('/especialidad', function(req, res, next) {
    var newEspecialidad = new especialidad(req.body)
    newEspecialidad.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    })
});

router.put('/especialidad/:id', function(req, res, next) {
    especialidad.findByIdAndUpdate(req.params.id, req.body, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/especialidad/:id', function(req, res, next) {
    especialidad.findByIdAndRemove(req.params.id, req.body, function(err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
})

export = router;