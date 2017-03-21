"use strict";
var express = require("express");
var agenda = require("../schemas/agenda");
var logService_1 = require("../../../utils/logService");
var validateDarTurno_1 = require("../../../utils/validateDarTurno");
var paciente_1 = require("../../../core/mpi/schemas/paciente");
var tipoPrestacion_1 = require("../../../core/tm/schemas/tipoPrestacion");
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
router.patch('/agenda/:idAgenda/bloque/:idBloque/turno/:idTurno', function (req, res, next) {
    var continues = validateDarTurno_1.ValidateDarTurno.checkTurno(req.body);
    //console.log(continues);
    if (continues.valid) {
        paciente_1.paciente.findById(req.body.paciente.id, function verificarPaciente(err, cant) {
            if (err) {
                console.log('PACIENTE INEXISTENTE', err);
                return next(err);
            }
            else {
                tipoPrestacion_1.tipoPrestacion.findById(req.body.tipoPrestacion._id, function verificarTipoPrestacion(err, data) {
                    if (err) {
                        console.log('TIPO PRESTACION INEXISTENTE', err);
                        return next(err);
                    }
                    else {
                        console.log(cant);
                        agenda.findById(req.params.idAgenda, function getAgenda(err, data) {
                            if (err) {
                                return next(err);
                            }
                            var posBloque;
                            var posTurno;
                            // Los siguientes 2 for ubican el indice del bloque y del turno
                            for (var x = 0; x < data.bloques.length; x++) {
                                if (data.bloques[x]._id.equals(req.params.idBloque)) {
                                    posBloque = x;
                                    console.log('POSBLOQUE: ' + posBloque);
                                }
                            }
                            for (var y = 0; y < data.bloques[posBloque].turnos.length; y++) {
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
                            console.log('QUERY ' + query);
                            agenda.findOneAndUpdate(query, { $set: update }, { new: true, passRawResult: true }, function actualizarAgenda(err2, doc2, writeOpResult) {
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
            }
        });
    }
    else {
        console.log('NO VALIDO');
        return next();
    }
});
module.exports = router;
//# sourceMappingURL=turno.js.map