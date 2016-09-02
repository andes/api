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
module.exports = router;
//# sourceMappingURL=profesional.js.map