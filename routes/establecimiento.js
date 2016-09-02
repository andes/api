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