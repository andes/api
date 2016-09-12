"use strict";
var express = require('express');
var provincia = require('../schemas/provincia');
var router = express.Router();
router.get('/provincia', function (req, res, next) {
    provincia.find({}, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
router.get('/provincia/:id*?', function (req, res, next) {
    if (req.params.id) {
        provincia.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = provincia.find({});
        if (req.query.nombre) {
            query.where('nombre').equals(req.query.nombre);
        }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
module.exports = router;
//# sourceMappingURL=provincia.js.map