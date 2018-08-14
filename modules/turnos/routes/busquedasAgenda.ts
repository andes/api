import * as express from 'express';
import * as busquedasAgenda from '../schemas/busquedasAgenda';

const router = express.Router();

router.get('/busquedasAgenda/:_id*?', (req, res, next) => {
    if (req.params._id) {
        busquedasAgenda.findById(req.params._id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {
        let query;
        query = busquedasAgenda.find({}); // Trae todos
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        query.exec((err, data) => {
            if (err) {return next(err); }
            res.json(data);
        });
    }
});

router.post('/busquedasAgenda', (req, res, next) => {
    const newBusquedasAgenda = new busquedasAgenda(req.body);
    newBusquedasAgenda.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newBusquedasAgenda);
    });
});

router.put('/busquedasAgenda/:id', (req, res, next) => {
    busquedasAgenda.findByIdAndUpdate(req.params.id, req.body, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/busquedasAgenda/:_id', (req, res, next) => {
    busquedasAgenda.findByIdAndRemove(req.params._id, (err, data) => {
        if (err) { return next(err); }
        res.json(data);
    });
});

export = router;
