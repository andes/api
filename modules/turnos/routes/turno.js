"use strict";
var express = require("express");
var agenda = require("../schemas/agenda");
var logService_1 = require("../../../utils/logService");
var validateDarTurno_1 = require("../../../utils/validateDarTurno");
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
router.patch('/agenda/:idAgenda/turno/:idTurno', function (req, res, next) {
    var continues = validateDarTurno_1.ValidateDarTurno.checkTurno(req.body);
    console.log(continues);
    if (continues.valid) {
        agenda.findById(req.params.idAgenda, function (err, data) {
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
                    // console.log('POSBLOQUE: ' + posBloque);
                }
            }
            for (var y = 0; y < data.bloques[posBloque].turnos.length; y++) {
                // console.log((data as any).bloques[posBloque].turnos[y]._id)
                // console.log(req.body.idTurno)
                if (data.bloques[posBloque].turnos[y]._id.equals(req.params.idTurno)) {
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
            var query = {
                _id: req.params.idAgenda,
            };
            query[etiquetaEstado] = 'disponible'; // agrega un tag al json query
            console.log(query);
            agenda.findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true }, function (err2, doc2, writeOpResult) {
                if (err2) {
                    console.log('ERR2: ' + err2);
                    return next(err2);
                }
                var datosOp = {
                    estado: update[etiquetaEstado],
                    paciente: update[etiquetaPaciente],
                    prestacion: update[etiquetaPrestacion]
                };
                logService_1.Logger.log(req, 'agenda', 'modificar agenda', datosOp);
            });
            res.json(data);
        });
    }
});
module.exports = router;
//# sourceMappingURL=turno.js.map