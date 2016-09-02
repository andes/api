"use strict";
var express = require('express');
var establecimiento = require('../schemas/establecimiento');
//var ObjectID = require('mongodb').ObjectID
var router = express.Router();
router.get('/establecimiento', function (req, res, next) {
    establecimiento.find({}, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
router.get('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findById(req.params._id, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
router.post('/establecimiento', function (req, res, next) {
    var newEstablecimiento = new establecimiento(req.body);
    newEstablecimiento.save(function (err) {
        if (err) {
            next(err);
        }
        res.json(newEstablecimiento);
    });
});
router.put('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.delete('/establecimiento/:_id', function (req, res, next) {
    establecimiento.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.get('/establecimiento/:id', function (req, res, next) {
    establecimiento.findOne({ _id: req.params.id }, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=establecimiento.js.map