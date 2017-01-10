"use strict";
var express = require('express');
var paciente = require('../../schemas/paciente');
var servicioSisa_1 = require('./../../utils/servicioSisa');
var router = express.Router();
router.get('/bloque/:id', function (req, res, next) {
    if (req.params.id) {
        var filtro = "claveBlocking." + req.params.id;
        paciente.aggregate([{
                "$group": {
                    "_id": {
                        "$arrayElemAt": ["$claveBlocking", Number(req.params.id)]
                    },
                    "count": {
                        "$sum": 1
                    }
                }
            }, {
                "$match": {
                    count: {
                        $gt: 1
                    }
                }
            }], function (err, data) {
            if (err) {
                next(err);
            }
            ;
            var claves = data.map(function (elemt) {
                var dato = elemt._id;
                return dato;
            }).filter(function (n) {
                return (n != undefined && n != null && n != "");
            });
            res.json(claves);
        });
    }
});
router.get('/bloque/paciente/:idb/:id', function (req, res, next) {
    var filtro = "claveBlocking." + req.params.idb;
    var query = {};
    query[filtro] = {
        $eq: req.params.id
    };
    //console.log('Parametros', query)
    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        var lista;
        lista = data.map(function (ele) {
            return {
                "paciente": ele,
                "matcheos": null
            };
        });
        res.json(lista);
    });
});
router.get('/bloque/pacienteSisa/:idb/:id', function (req, res, next) {
    var filtro = "claveBlocking." + req.params.idb;
    var query = {};
    query[filtro] = {
        $eq: req.params.id
    };
    //console.log('Parametros', query)
    var listaPac = [];
    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        var servSisa = new servicioSisa_1.servicioSisa();
        var pacientesRes = [];
        var weights = {
            identity: 0.3,
            name: 0.3,
            gender: 0.1,
            birthDate: 0.3
        };
        var listaPac;
        listaPac = data;
        listaPac.forEach(function (elem) {
            var valorSisa = 0;
            var auxPac = elem;
            pacientesRes.push(servSisa.matchSisa(auxPac));
        });
        Promise.all(pacientesRes).then(function (values) {
            //console.log(values);
            res.json(values);
        }).catch(function (err) {
            console.log(err);
            next(err);
        });
    });
});
router.post('/bloque/paciente/fusionar', function (req, res, next) {
    var pacienteOriginal = new paciente(req.body.pacienteOriginal);
    var pacienteFusionar = new paciente(req.body.pacienteFusionar);
    //console.log('pacienteOriginal',pacienteOriginal);
    //console.log('pacienteFusionar',pacienteFusionar);
    var query = { "_id": pacienteFusionar._id };
    paciente.findOne(query, function (err, data) {
        if (err) {
            next(err);
        }
        ;
        var pacAux;
        pacAux = data;
        //console.log('pacAux',pacAux);
        var arrayIds = pacAux.identificadores;
        paciente.update({ "_id": pacienteOriginal._id }, { $addToSet: { "identificadores": { $each: arrayIds } } }, { upsert: true }, function (err) {
            if (err) {
                next(err);
            }
            else {
                paciente.findByIdAndRemove(pacienteFusionar.id.toString(), function (err, elem) {
                    if (err)
                        return next(err);
                    res.json(elem);
                });
            }
        });
    });
});
router.delete('/bloque/paciente/:id', function (req, res, next) {
    console.log(req.params.id);
    paciente.findByIdAndRemove(req.params.id, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=bloque.js.map