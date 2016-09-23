"use strict";
var express = require('express');
var practitioner = require('../schemas/practitioner');
var utils = require('../utils/utils');
var router = express.Router();
router.get('/practitioner/:_id*?', function (req, res, next) {
    if (req.params.id) {
        practitioner.findById(req.params._id, function (err, data) {
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
            if (req.query.search) {
                opciones['$or'] = [{
                        "name.text": {
                            "$regex": utils.makePattern(req.query.search)
                        }
                    }, {
                        "document.value": {
                            "$regex": utils.makePattern(req.query.search)
                        }
                    }];
            }
        }
        query = practitioner.find(opciones);
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
router.post('/practitioner', function (req, res, next) {
    var newProfesional = new practitioner(req.body);
    newProfesional.save(function (err) {
        if (err) {
            next(err);
        }
        res.json(newProfesional);
    });
});
router.put('/practitioner/:_id', function (req, res, next) {
    practitioner.findByIdAndUpdate(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
router.delete('/practitioner/:_id', function (req, res, next) {
    practitioner.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=practitioner.js.map