"use strict";
var express = require('express');
var agenda = require('../schemas/agenda');
var router = express.Router();
//El put se usa para pasar el turno a estado asignado, ver con Juan
router.put('/turno/:_id', function (req, res) {
    var etiquetaEstado = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".estado";
    var etiquetaPaciente = "bloques." + req.body.indiceBloque + ".turnos." + req.body.indiceTurno + ".paciente";
    console.log(req.body.estado);
    var query = {
        _id: req.params._id
    };
    query[etiquetaEstado] = "disponible"; //agrega un tag al json query
    var update = {};
    update[etiquetaEstado] = req.body.estado;
    update[etiquetaPaciente] = req.body.paciente;
    agenda.findOneAndUpdate(query, { $set: update }, function (err, agen) {
        if (err)
            res.send(err);
        res.json(agen);
    });
});
module.exports = router;
//# sourceMappingURL=turno.js.map