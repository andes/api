"use strict";
var express = require('express');
var profesional = require('../schemas/profesional');
var router = express.Router();
router.get('/profesional', function (req, res, next) {
    profesional.find({}, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
router.get('/profesional/:_id', function (req, res, next) {
    profesional.findById(req.params._id, function (err, data) {
        if (err) {
            next(err);
        }
        ;
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