import { servicioSintys } from '../../../../utils/servicioSintys';
import * as express from 'express';
import { paciente } from '../../schemas/paciente';
import { servicioSisa } from '../../../../utils/servicioSisa';
import * as config from '../../../../config';

var router = express.Router();

router.get('/bloques/:idTipoBloque', function (req, res, next) {
    if (req.params.idTipoBloque) {
        var filtro = "claveBlocking." + req.params.idTipoBloque;
        paciente.aggregate([{
            "$group": {
                "_id": {
                    "$arrayElemAt": ["$claveBlocking", Number(req.params.idTipoBloque)]
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
            };

            var claves = data.map(elemt => {
                var dato = elemt._id;
                return dato
            }).filter(n => {
                return (n != undefined && n != null && n != "")
            });

            res.json(claves);
        })
    }
});

router.get('/bloques/pacientes/:idTipoBloque/:idBloque', function (req, res, next) {
    var filtro = "claveBlocking." + req.params.idTipoBloque;
    var query = {};
    query[filtro] = {
        $eq: req.params.idBloque
    };

    //console.log('Parametros', query)
    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        };

        var lista;
        lista = data.map(ele => {
            return {
                "paciente": ele,
                "matcheos": null
            }
        })
        res.json(lista);
    })
});

router.get('/bloques/pacientesSisa/:idTipoBloque/:idBloque', function (req, res, next) {
    var filtro = "claveBlocking." + req.params.idTipoBloque;
    var query = {};
    query[filtro] = {
        $eq: req.params.idBloque
    };

    let listaPac = [];
    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        };
        let servSisa = new servicioSisa();
        let pacientesRes = [];
        let weights = config.configMpi.weightsDefault;
        let listaPac;
        listaPac = data;
        listaPac.forEach(function (elem) {
            var valorSisa = 0;
            var auxPac = elem;
            pacientesRes.push(servSisa.matchSisa(auxPac));
        })
        Promise.all(pacientesRes).then(values => {
            var arrPacValidados;
            arrPacValidados = values;
            var arrSalida = [];
            arrPacValidados.forEach(function (pacVal) {
                var datoPac;
                datoPac = pacVal;
                if (datoPac.matcheos.matcheo >= 99 && datoPac.paciente.estado == 'temporal') {
                    arrSalida.push(servSisa.validarPaciente(datoPac, "Sisa"))
                } else {
                    arrSalida.push(datoPac);
                }
            });

            Promise.all(arrSalida).then(PacSal => {
                res.json(PacSal);
            }).catch(err => {
                console.log(err);
                next(err);
            })

        }).catch(err => {
            console.log(err);
            next(err);
        })

    })
});

router.post('/bloques/pacientes/fusionar', function (req, res, next) {
    var pacienteOriginal = new paciente(req.body.pacienteOriginal);
    var pacienteFusionar = new paciente(req.body.pacienteFusionar);
    var query = { "_id": pacienteFusionar._id };
    paciente.findOne(query, function (err, data) {
        if (err) {
            return next(err);
        };
        var pacAux;
        pacAux = data;
        console.log('pacAux', pacAux);
        var arrayIds = pacAux.identificadores;
        paciente.update({ "_id": pacienteOriginal._id }, { $addToSet: { "identificadores": { $each: arrayIds } } }, { upsert: true },
            function (err) {
                if (err) {
                    return next(err);
                } else {
                    paciente.findByIdAndUpdate(pacienteFusionar._id.toString(), { "activo": false }, { new: true }, function (err, elem) {
                        if (err)
                            return next(err);
                        res.json(elem);
                    });
                }
            });

    });
});

router.delete('/bloques/pacientes/:id', function (req, res, next) {
    console.log(req.params.id);
    paciente.findByIdAndUpdate(req.params.id, { "activo": false }, { new: true }, function (err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});


router.post('/bloques/pacientes/validar', function (req, res, next) {
    console.log("Entra a validar", req.body);
    var pacienteVal = new paciente(req.body.paciente);
    var entidad = req.body.entidad;
    var servSisa = new servicioSisa();
    var datoCompleto = { "paciente": pacienteVal, "matcheos": { "entidad": entidad, "matcheo": 0, "datosPaciente": {} } };
    servSisa.validarPaciente(datoCompleto, entidad).then(resultado => {
        res.json(resultado);
    })
        .catch(err => {
            return next(err);
        })
});



router.post('/bloques/pacientes/validarActualizar', function (req, res, next) {
    console.log("Entra a validar", req.body);
    var pacienteVal = new paciente(req.body.paciente);
    var entidad = req.body.entidad;
    var datosPacEntidad = req.body.DatoPacEntidad;

    var servSisa = new servicioSisa();
    console.log("entidad", entidad);
    var datoCompleto = { "paciente": pacienteVal, "matcheos": { "entidad": entidad, "matcheo": 0, "datosPaciente": datosPacEntidad } };
    console.log("Dato Completo", datoCompleto);
    servSisa.validarActualizarPaciente(datoCompleto, entidad, datosPacEntidad).then(resultado => {
        res.json(resultado);
    })
        .catch(err => {
            return next(err);
        })
});


/************SYNTIS************** */
router.get('/bloques/pacientesSintys/:idb/:id', function (req, res, next) {
    var filtro = "claveBlocking." + req.params.idb;
    var query = {};
    query[filtro] = {
        $eq: req.params.id
    };

    var listaPac = [];
    paciente.find(query, function (err, data) {
        if (err) {
            next(err);
        };
        var servSintys = new servicioSintys();
        var servSisa = new servicioSisa();
        var pacientesRes = [];
        var weights = config.configMpi.weightsDefault;
        var listaPac;
        listaPac = data;
        listaPac.forEach(function (elem) {
            var valorSisa = 0;
            var auxPac = elem;
            pacientesRes.push(servSintys.matchSintys(auxPac));
        })
        Promise.all(pacientesRes).then(values => {
            //console.log("Inicia Promise All");
            var arrPacValidados;
            arrPacValidados = values;
            var arrSalida = [];
            arrPacValidados.forEach(function (pacVal) {
                var datoPac;
                datoPac = pacVal;
                if (datoPac.matcheos.matcheo >= 99 && datoPac.paciente.estado == 'temporal') {
                    arrSalida.push(servSisa.validarPaciente(datoPac, "Sintys"))
                } else {
                    arrSalida.push(datoPac);
                }
            });

            Promise.all(arrSalida).then(PacSal => {
                //console.log("devuelvo el array", PacSal);
                res.json(PacSal);
            }).catch(err => {
                console.log(err);
                return next(err);
            })

        }).catch(err => {
            console.log(err);
            return next(err);
        })

    })
});

export = router;
