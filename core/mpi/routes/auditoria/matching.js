"use strict";
var express = require("express");
var matching = require("../../schemas/matching");
var router = express.Router();
router.get('/matching/:id*?', function (req, res, next) {
    if (req.params.id) {
        matching.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = matching.find({}).limit(50); //Trae todos 
        // if (req.query.nombre) {
        //     query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        // }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
router.post('/matching', function (req, res, next) {
    var newMatching = new matching(req.body);
    newMatching.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json(newMatching);
    });
});
router.put('/matching/:id', function (req, res, next) {
    matching.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
router.delete('/matching/:_id', function (req, res, next) {
    matching.findByIdAndRemove(req.params._id, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=matching.js.map