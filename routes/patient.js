"use strict";
var express = require('express');
var patient = require('../schemas/patient');
var router = express.Router();
router.get('/patient/:id*?', function (req, res, next) {
    if (req.params.id) {
        patient.findById(req.params.id, function (err, data) {
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
        if (req.query.search) {
            opciones = {
                $text: {
                    $search: req.query.search.toLowerCase()
                }
            };
            query = patient.find(opciones);
            query.exec(function (err, data) {
                if (err)
                    return next(err);
                res.json(data);
            });
        }
        else {
            if (!(req.query.document || req.query.family || req.query.given))
                //aca debería devolver un error avisando que busque por algún parametro
                //Ejemplo devolver: return next(400);
                //Ahora sin parametros devuelve todo
                var opciones = {};
            //Terminar esta parte por búsqueda simples
            // if (req.query.document)
            // //terminar
            // {
            //     opciones = {'document.value' : req.query.document}
            //     console.log (opciones);
            // }
            // if (req.query.family)
            //     opciones = {'name.family' : req.query.family}
            // if (req.query.given)
            //     opciones = {'name.given' : req.query.given}
            query = patient.find(opciones);
            query.exec(function (err, data) {
                if (err)
                    return next(err);
                res.json(data);
            });
        }
    }
});
router.post('/patient', function (req, res, next) {
    var newPatient = new patient(req.body);
    newPatient.save(function (err) {
        if (err) {
            next(err);
        }
        res.json(newPatient);
    });
});
router.put('/patient/:_id', function (req, res, next) {
    patient.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.delete('/patient/:_id', function (req, res, next) {
    patient.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=patient.js.map