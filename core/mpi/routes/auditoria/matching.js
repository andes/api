"use strict";
const express = require("express");
const paciente_1 = require("../../schemas/paciente");
const servicioSisa_1 = require("../../../../utils/servicioSisa");
let router = express.Router();
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
        let query;
        query = paciente_1.paciente.find({
            matchSisa: {
                $gt: 0.7,
                $lte: 0.99
            },
            estado: 'temporal'
        });
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});
router.patch('/matching/:id', function (req, res, next) {
    paciente_1.paciente.findById(req.params.id, function (err, data) {
        if (req.body.op === 'validarSisa') {
            let servSisa = new servicioSisa_1.ServicioSisa();
            let pacienteOriginal;
            let pacienteAux;
            pacienteOriginal = data;
            pacienteAux = data;
            let pacientesRes = [];
            servSisa.matchSisa(pacienteAux)
                .then(resultado => {
                pacientesRes.push(resultado);
                let arrPacValidados;
                arrPacValidados = pacientesRes;
                let arrPacientesSisa = [];
                arrPacValidados.forEach(function (pacVal) {
                    let datoPac;
                    datoPac = pacVal.matcheos.datosPaciente;
                    if (datoPac) {
                        arrPacientesSisa.push(datoPac);
                    }
                });
                res.send(arrPacientesSisa);
            })
                .catch(error => {
                next(error);
            });
        }
    });
});
router.put('/matching/:id', function (req, res, next) {
    paciente_1.paciente.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=matching.js.map