import * as express from 'express';
import * as configPrestacion from '../schemas/configPrestacion';

let router = express.Router();

router.get('/configPrestacion/:id*?', function (req, res, next) {
    if (req.params.id) {
        configPrestacion.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {
        let query;
        query = configPrestacion.find({}); // Trae todos

        if (req.query.prestacion) {
            query.where('prestacion.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        query.exec((err, data) => {
            if (err) { return next(err); }
            res.json(data);
        });
    }
});

router.post('/configPrestacion', function (req, res, next) {
    // var newEspecialidad = new especialidad(req.body)
    // aca deberia setear todo en false
    let newEspecialidad = new configPrestacion(req.body);
    newEspecialidad.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    });
});

router.put('/configPrestacion/:id', function (req, res, next) {
    configPrestacion.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
