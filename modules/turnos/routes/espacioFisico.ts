import * as express from 'express';
import * as mongoose from 'mongoose';
import { espacioFisico } from '../schemas/espacioFisico';

let router = express.Router();

router.get('/espacioFisico/:_id*?', function (req, res, next) {
    if (req.params._id) {
        espacioFisico.findById(req.params._id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        // Trae todos
        let query = espacioFisico.find({});
        let nombres = [];

        if (req.query.nombre) {
            nombres.push({ 'nombre': RegExp('^.*' + req.query.nombre + '.*$', 'i') });
            nombres.push({ 'sector.nombre': RegExp('^.*' + req.query.nombre + '.*$', 'i') });
            nombres.push({ 'servicio.nombre': RegExp('^.*' + req.query.nombre + '.*$', 'i') });
            nombres.push({ 'edificio.descripcion': RegExp('^.*' + req.query.nombre + '.*$', 'i') });
            // query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
            query.or(nombres);
        }

        if (req.query.descripcion) {
            query.where('descripcion').equals(RegExp('^.*' + req.query.descripcion + '.*$', 'i'));
        }

        if (req.query.sector) {
            query.where('sector.nombre').equals(RegExp('^.*' + req.query.sector + '.*$', 'i'));
        }

        if (req.query.edificio) {
            query.where('edificio.descripcion').equals(RegExp('^.*' + req.query.edificio + '.*$', 'i'));
        }

        if (req.query.servicio) {
            query.where('servicio.nombre').equals(RegExp('^.*' + req.query.servicio + '.*$', 'i'));
        }

        if (req.query.organizacion) {
            query.where('organizacion._id').equals(mongoose.Types.ObjectId(req.query.organizacion));
        }

        if (req.query.sinOrganizacion) {
            query.where('organizacion').exists(false);
        }

        if (req.query.equipamiento) {
            let items;
            if (Array.isArray(req.query.equipamiento)) {
                items = req.query.equipamiento.map((item) => RegExp('^.*' + item + '.*$', 'i'));
            } else {
                items = RegExp('^.*' + req.query.equipamiento + '.*$', 'i');
            }
            query.where('equipamiento.term').in(items);
        }

        if (req.query.limit) {
            query.limit(Number(req.query.limit));
        }

        // Trae sólo los espacios físicos activos
        if (req.query.activo) {
            query.where('activo').equals(true);
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
            return next(err);
        }
        res.json(data);
    });

});

router.post('/espacioFisico', function (req, res, next) {
    let newEspacioFisico = new espacioFisico(req.body);
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

router.delete('/espacioFisico/:id', function (req, res, next) {
    espacioFisico.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }

        res.json(data);
    });
});

export = router;
