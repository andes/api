"use strict";
var express = require('express');
var paciente_1 = require('../../schemas/paciente');
var router = express.Router();
router.get('/matching/:id*?', function (req, res, next) {
    if (req.params.id) {
        paciente_1.paciente.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = paciente_1.paciente.find({ matchSisa: { $gt: 0.7, $lte: 0.99 }, estado: 'temporal' });
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
module.exports = router;
//# sourceMappingURL=matching.js.map