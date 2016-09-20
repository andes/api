"use strict";
var express = require('express');
var patient = require('../schemas/patient');
var router = express.Router();
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