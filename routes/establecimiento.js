"use strict";
var express = require('express');
var establecimiento = require('../schemas/establecimiento');
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
module.exports = router;
//# sourceMappingURL=establecimiento.js.map