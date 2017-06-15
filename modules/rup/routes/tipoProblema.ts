import * as express from 'express';
import { tipoProblema } from '../schemas/tipoProblema';

let router = express.Router();

router.get('/tiposProblemas/:id*?', function (req, res, next) {
    let query;

    if (req.params.id) {

        query = tipoProblema.findById(req.params.id);

    } else {
        query = tipoProblema.find({}); // Trae todos

        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }

        if (req.query.activo) {
            query.where('activo').equals(req.query.activo);
        }

        if (req.query.origen) {
            query.where('codigo.origen').equals(req.query.origen);
        }

        if (req.query.tiposProblemas) {
            let idsTiposProblemas = req.query.tiposProblemas.split(',');
            query.where('_id').in(idsTiposProblemas);
        }
    }

    query.sort({ 'nombre': 1 }).exec(function (err, data) {
        if (err) {
            next(err);
        }

        res.json(data);
    });


});

router.post('/tiposProblemas', function (req, res, next) {
    let tipoProblema; tipoProblema = new tipoProblema(req.body);
    tipoProblema.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(tipoProblema);
    });
});

router.put('/tiposProblemas/:id', function (req, res, next) {
    tipoProblema.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/tiposProblemas/:id', function (req, res, next) {
    tipoProblema.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
