"use strict";
var express = require('express');
var profesional = require('../schemas/profesional');
var utils = require('../utils/utils');
var router = express.Router();
router.get('/profesional/:_id*?', function (req, res, next) {
    if (req.params.id) {
        profesional.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        var opciones = {};
        if (req.query.apellido) {
            opciones['apellido'] = { '$regex': utils.makePattern(req.query.apellido) };
        }
        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento;
        }
    }
    console.log(opciones);
    query = profesional.find(opciones);
    // opciones = {
    //     apellido: {
    //         $regex: '/^' + req.query.apellido + '/i'
    //     }
    // }
    // if (req.query.documento)
    //     query.where('documento').equals(req.query.documento);
    // if (req.query.apellido)
    //       query.where('apellido').equals(req.query.apellido);
    // if (req.query.fechaNacimiento)
    //     query.where('fechaNacimiento').equals(req.query.fechaNacimiento);
    //var opciones = {};
    // if (req.query.search) {
    // opciones['$or'] = [{
    //             "name.text": {
    //                 "$regex": utils.makePattern(req.query.search)
    //             }
    //         }, {
    //             "document.value": {
    //                 "$regex": utils.makePattern(req.query.search)
    //             }
    //         }]
    // }
    //query = profesional.find(opciones);
    query.exec(function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.post('/profesional', function (req, res, next) {
    var newProfesional = new profesional(req.body);
    newProfesional.save(function (err) {
        if (err) {
            next(err);
        }
        res.json(newProfesional);
    });
});
router.put('/profesional/:_id', function (req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.delete('/profesional/:_id', function (req, res, next) {
    profesional.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=profesional.js.map