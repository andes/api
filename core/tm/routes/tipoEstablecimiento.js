"use strict";
var express = require('express');
var tipoEstablecimiento = require('../schemas/tipoEstablecimiento_model');
var router = express.Router();
router.get('/tipoEstablecimiento', function (req, res, next) {
    tipoEstablecimiento.find({}, { nombre: 1 }, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=tipoEstablecimiento.js.map