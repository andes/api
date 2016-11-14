import * as express from 'express'
import * as consultorio from '../../../schemas/turnos/consultorio'

var router = express.Router();

router.get('/consultorio/:id*?', function (req, res, next) {
    if (req.params.id) {
        consultorio.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data); 
        });
    } else {
        var query;
        query = consultorio.find({}); //Trae todos 
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec((err, data) => {
            if (err) return next(err);
            res.json(data);
        });
    }
});

router.post('/consultorio', function (req, res, next) {
    var newConsultorio = new consultorio(req.body)
    newConsultorio.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newConsultorio);
    })
});

router.put('/consultorio/:id', function (req, res, next) {
    consultorio.findByIdAndUpdate(req.params.id, req.body, {new:true}, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/consultorio/:_id', function (req, res, next) {
    consultorio.findByIdAndRemove(req.params._id, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;