"use strict";
var express = require("express");
var agenda = require("../schemas/agenda");
var router = express.Router();
// next como tercer parametro
router.put('/turno/:id', function (req, res, next) {
    var changes = req.body;
    var etiquetaEstado = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.estado';
    var etiquetaPaciente = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.paciente';
    var etiquetaPrestacion = 'bloques.' + req.body.indiceBloque + '.turnos.' + req.body.indiceTurno + '.tipoPrestacion';
    var query = {
        _id: req.params.id
    };
    query[etiquetaEstado] = 'disponible'; // agrega un tag al json query
    var update = {};
    update[etiquetaEstado] = 'asignado';
    update[etiquetaPrestacion] = req.body.tipoPrestacion;
    update[etiquetaPaciente] = req.body.paciente;
    // console.log("Update   ", update);
    agenda.findOneAndUpdate(query, { $set: update }, function (err, agen) {
        if (err) {
            return next(err);
        }
        res.json(agen);
    });
});
router.patch('/turno/:id', function (req, res, next) {
    agenda.findById(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }
        var posBloque;
        var posTurno;
        // console.log((data as any).bloques.length)
        // console.log('ID BLOQUE: ' + req.body.idBloque)
        // console.log('ID TURNO: ' + req.body.idTurno)
        // console.log('POSBLOQUE: ' + (data as any).bloques.indexOf((data as any).bloques[0]))
        for (var x = 0; x < data.bloques.length; x++) {
            if (data.bloques[x]._id.equals(req.body.idBloque)) {
                posBloque = x;
                console.log('POSBLOQUE: ' + posBloque);
            }
        }
        for (var y = 0; y < data.bloques[posBloque].turnos.length; y++) {
            // console.log((data as any).bloques[posBloque].turnos[y]._id)
            // console.log(req.body.idTurno)
            if (data.bloques[posBloque].turnos[y]._id.equals(req.body.idTurno)) {
                posTurno = y;
                console.log('POSTURNO: ' + posTurno);
            }
        }
        var etiquetaEstado = 'bloques.' + posBloque + '.turnos.' + posTurno + '.estado';
        var etiquetaPaciente = 'bloques.' + posBloque + '.turnos.' + posTurno + '.paciente';
        var etiquetaPrestacion = 'bloques.' + posBloque + '.turnos.' + posTurno + '.tipoPrestacion';
        var update = {};
        update[etiquetaEstado] = 'asignado';
        update[etiquetaPrestacion] = req.body.tipoPrestacion;
        update[etiquetaPaciente] = req.body.paciente;
        agenda.findByIdAndUpdate(req.params.id, update, function (err2, data2) {
            if (err2) {
                return next(err2);
            }
        });
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=turno.js.map