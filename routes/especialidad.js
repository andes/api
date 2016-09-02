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
module.exports = router;
//# sourceMappingURL=especialidad.js.map