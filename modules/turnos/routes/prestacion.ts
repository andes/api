import * as express from 'express'
import * as prestacion from '../schemas/prestacion'

var router = express.Router();

router.get('/prestacion/:_id*?', function (req, res, next) {
    if (req.params.id) {
        prestacion.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        var query;
        query = prestacion.find({}); //Trae todos 
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec((err, data) => {
            if (err) return next(err);
            res.json(data);
        });
    }
});

router.post('/prestacion', function (req, res, next) {
    var newPrestacion = new prestacion(req.body)
    newPrestacion.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newPrestacion);
    })
});

router.put('/prestacion/:id', function (req, res, next) {
    prestacion.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/prestacion/:_id', function (req, res, next) {
    prestacion.findByIdAndRemove(req.params._id, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;