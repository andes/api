"use strict";
var express = require('express');
var tipoEstablecimiento = require('../schemas/tipoEstablecimiento_model');
var router = express.Router();
router.get('/tiposEstablecimiento/:id*?', function (req, res, next) {
    if (req.params.id) {
        tipoEstablecimiento.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        tipoEstablecimiento.find({}, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
});
module.exports = router;
//# sourceMappingURL=tipoEstablecimiento.js.map