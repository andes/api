import * as express from 'express';
import * as busquedasAgenda from '../schemas/busquedasAgenda';

let router = express.Router();

router.get('/busquedasAgenda/:_id*?', function (req, res, next) {
    if (req.params._id) {
        busquedasAgenda.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        let query;
        query = busquedasAgenda.find({}); // Trae todos
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        query.exec((err, data) => {
            if (err) {return next(err); };
            res.json(data);
        });
    }
});

router.post('/busquedasAgenda', function (req, res, next) {
    let newBusquedasAgenda = new busquedasAgenda(req.body)
    newBusquedasAgenda.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newBusquedasAgenda);
        console.log(newBusquedasAgenda);
    });
});

router.put('/busquedasAgenda/:id', function (req, res, next) {
    busquedasAgenda.findByIdAndUpdate(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/busquedasAgenda/:_id', function (req, res, next) {
    busquedasAgenda.findByIdAndRemove(req.params._id, function (err, data) {
        if (err) { return next(err); };
        res.json(data);
    });
});

export = router;
