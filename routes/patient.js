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
    var query;
    var opciones = { 'name.family': 'Amundarain', gender: 'male' };
    // {'name.family':'Amundarain',gender:'male'}
    // if (req.query.family) {
    //     opciones.name.family = Array.isArray(req.query.family) ? {
    //         $in: req.query.family
    //     } : req.query.family;
    // }
    // if (req.query.gender) {
    //     opciones.gender = Array.isArray(req.query.gender) ? {
    //         $in: req.query.gender
    //     } : req.query.gender;
    // }
    console.log(opciones);
    query = patient.find(opciones);
    query.exec(function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
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