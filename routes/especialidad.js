"use strict";
var express = require('express');
var especialidad = require('../schemas/especialidad');
var router = express.Router();
router.get('/especialidad/:id*?', function (req, res, next) {
    if (req.params.id) {
        especialidad.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = especialidad.find({}); //Trae todos 
        if (req.query.codigoSisa)
            query.where('codigo.sisa').equals(req.query.codigoSisa);
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
router.post('/especialidad', function (req, res, next) {
    var newEspecialidad = new especialidad(req.body);
    newEspecialidad.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    });
});
router.put('/especialidad/:id', function (req, res, next) {
    especialidad.findByIdAndUpdate(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
router.delete('/especialidad/:id', function (req, res, next) {
    especialidad.findByIdAndRemove(req.params.id, req.body, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=especialidad.js.map