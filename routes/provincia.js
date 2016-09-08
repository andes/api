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
module.exports = router;
//# sourceMappingURL=provincia.js.map