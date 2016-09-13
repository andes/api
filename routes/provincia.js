"use strict";
var express = require('express');
var provincia = require('../schemas/provincia');
var router = express.Router();
router.get('/provincia/:id*?', function (req, res, next) {
    console.log(req.params);
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
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
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