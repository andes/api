"use strict";
var express = require('express');
var especialidad = require('../schemas/especialidad');
var router = express.Router();
router.get('/especialidad', function (req, res, next) {
    especialidad.find({}, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
router.get('/especialidad/:id', function (req, res, next) {
    especialidad.findOne({
        _id: req.params.id
    }, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
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