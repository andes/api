"use strict";
var express = require('express');
var agenda = require('../schemas/agenda');
var jsonpatch1 = require('fast-json-patch');
var jsonpatch = require('jsonpatch/lib/jsonpatch');
// var expect = require('jsonpatch/test/vendor/expect.js');
var router = express.Router();
router.get('/agenda/:id*?', function (req, res, next) {
    if (req.params.id) {
        agenda.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = agenda.find({}); //Trae todos
        if (req.query.fechaDesde) {
            query.where('horaInicio').gte(req.query.fechaDesde);
        }
        if (req.query.fechaHasta) {
            query.where('horaFin').lte(req.query.fechaHasta);
        }
        if (req.query.idEspacioFisico) {
            query.where('espacioFisico.id').equals(req.query.idEspacioFisico);
        }
        if (req.query.idProfesional) {
            query.where('profesionales.id').equals(req.query.idProfesional);
        }
        if (req.query.idPrestacion) {
            query.where('prestaciones.id').equals(req.query.idPrestacion);
        }
        //Dada una lista de prestaciones, filtra las agendas que tengan al menos una de las prestaciones
        if (req.query.prestaciones) {
            var arr_prestaciones = JSON.parse(req.query.prestaciones);
            var variable_1 = [];
            arr_prestaciones.forEach(function (prestacion, index) {
                // console.log ("prestacion "+prestacion._id);
                variable_1.push({ "prestaciones.id": prestacion._id });
            });
            query.or(variable_1);
        }
        if (!Object.keys(query).length) {
            res.status(400).send("Debe ingresar al menos un parámetro");
            return next(400);
        }
        query = agenda.find(query).sort({
            fechaDesde: 1,
            fechaHasta: 1
        });
        //console.log("query ", query._conditions)
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
router.post('/agenda', function (req, res, next) {
    var newAgenda = new agenda(req.body);
    newAgenda.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json(newAgenda);
    });
});
router.put('/agenda/:_id', function (req, res, next) {
    agenda.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
router.patch('/agenda/:_id', function (req, res, next) {
    agenda.findById(req.params._id, function (err, data) {
        var myobj = {
            agenda: {
                'bloques': [{
                        'turnos': [{
                                'asistencia': true
                            }]
                    }]
            }
        };
        // let thepatch = [
        //     { "op": "replace", "path": "/bloques/0/turnos/0/asistencia", "value": "boo" }
        // ]
        // let patcheddoc = jsonpatch.apply_patch(myobj, thepatch);
        // console.log("Patttt ", JSON.stringify(patcheddoc));
        // patcheddoc now equals {"baz": "boo", "foo": "bar"}}
        var conditions = {
            _id: req.params._id
        };
        var update = {};
        update[req.body.path] = req.body.value;
        //let update = JSON.stringify(req.body.path + '=' + req.body.value);//JSON.stringify(patcheddoc);
        console.log("Json ", update);
        agenda.findOneAndUpdate(conditions, { $set: update }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
        // let updateObject = req.body;
        // agenda.findByIdAndUpdate(req.params._id, { $set: updateObject }, function (err, data) {
        //     if (err) {
        //         return next(err);
        //     }
        //     res.json(data);
        // });
    });
});
// router.patch('/agenda/:_id', function (req, res, next) {
//     let update: any = {};
//      console.log("Entraaa ");
//     agenda.findById(req.params._id, function (err, data) {
//         if (err) {
//             return next(err);
//         }        
//         switch (req.body.operacion) {
//             case "asistencia":
//                 next("No se puede sust");
//             //    data.bloques[0].turnos[0].estado = req.body.idTurno;
//         }
//         data.bloques[0].turnos[0].asistencia = true;
//         data.save((err) => {
//             if (err) {
//                 return next(err);
//             }
//             res.json(data);
//         })
//     });
// });
// router.patch('/agenda/:_id', function (req, res, next) {
//     var updateObject = req.body; // {last_name : "smith", age: 44}
//     var id = req.params.id;
//     console.log('Entroooo ', id, ' capo ', updateObject);
//     agenda.update(req.params._id, req.body , {
//         $set: updateObject, function(err, data) {
//             if (err)
//                 return next(err)
//             res.json(data);
//         }
//     });
// });
router.delete('/agenda/:_id', function (req, res, next) {
    agenda.findByIdAndRemove(req.params._id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
;
module.exports = router;
//# sourceMappingURL=agenda.js.map