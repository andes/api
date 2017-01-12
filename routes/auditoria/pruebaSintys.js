"use strict";
var express = require('express');
var servicioSintys_1 = require('./../../utils/servicioSintys');
var router = express.Router();
router.get('/pacienteSintys/:id', function (req, res, next) {
    var unDocumento = req.params.id;
    var servSintys = new servicioSintys_1.servicioSintys();
    var pacientesRes = [];
    var weights = {
        identity: 0.3,
        name: 0.3,
        gender: 0.1,
        birthDate: 0.3
    };
    var datos = servSintys.getPacienteSintys(unDocumento);
    Promise.all(pacientesRes).then(function (values) {
        console.log(values);
        pacientesRes.push(values);
        res.json(values);
    }).catch(function (err) {
        console.log(err);
        next(err);
    });
});
module.exports = router;
//# sourceMappingURL=pruebaSintys.js.map