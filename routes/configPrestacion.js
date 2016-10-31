"use strict";
var express = require('express');
var configPrestacion = require('../schemas/turnos/configPrestacion');
var router = express.Router();
router.get('/configPrestacion/:id*?', function (req, res, next) {
    if (req.params.id) {
        configPrestacion.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = configPrestacion.find({}); //Trae todos 
        if (req.query.prestacion) {
            query.where('prestacion.nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
router.post('/configPrestacion', function (req, res, next) {
    //var newEspecialidad = new especialidad(req.body)
    //aca deberia setear todo en false
    var newEspecialidad = new configPrestacion(req.body);
    newEspecialidad.save(function (err) {
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
module.exports = router;
//# sourceMappingURL=configPrestacion.js.map