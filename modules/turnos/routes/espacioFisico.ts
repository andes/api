import * as express from 'express';
import { espacioFisico } from '../schemas/espacioFisico';

let router = express.Router();

router.get('/espacioFisico/:_id*?', function (req, res, next) {
    if (req.params._id) {
        espacioFisico.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    } else {
        let query;
        query = espacioFisico.find({}); // Trae todos
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        if (req.query.descripcion) {
            query.where('descripcion').equals(RegExp('^.*' + req.query.descripcion + '.*$', 'i'));
        }
        if (req.query.organizacion) {
            query.where('organizacion._id').equals(req.query.organizacion);
        }
        query.sort('nombre');
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

router.get('/espacioFisico/:idOrganizacion', function (req, res, next) {

    espacioFisico.find(req.params.idOrganizacion, function (err, data) {
        if (err) {
            next(err);
        };
        res.json(data);
    });

});

router.post('/espacioFisico', function (req, res, next) {
    let newEspacioFisico = new espacioFisico(req.body)
    newEspacioFisico.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newEspacioFisico);
    });
});

router.put('/espacioFisico/:id', function (req, res, next) {
    espacioFisico.findByIdAndUpdate(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.delete('/espacioFisico/:_id', function (req, res, next) {
    espacioFisico.findByIdAndRemove(req.params._id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
