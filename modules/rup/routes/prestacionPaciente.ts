import * as express from 'express';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { Logger } from '../../../utils/logService';
// import { log } from './../../../core/log/schemas/log';
import { prestacionPaciente } from '../schemas/prestacionPaciente';

let router = express.Router();

router.get('/prestaciones/forKey', function (req, res, next) {

    let filtro = 'ejecucion.evoluciones.valores';
    let key = req.query.key;
    let listakey = [];
    let query = { 'paciente._id': req.query.idPaciente };
    query[filtro] = {
        $exists: true
    };
    let consulta = prestacionPaciente.find(query).sort({ 'ejecucion.fecha': -1 });
    consulta.exec(function (err, data) {
        if (err) {
            next(err);
        } else {
            // Se recorren las prestaciones del paciente para obtener las prestaciones que incluyan la key recibida
            let prestaciones = data;
            let lista = [];
            let listaValores = [];
            if (prestaciones.length > 0) {
                prestaciones.forEach((prestacion: any) => {
                    prestacion.ejecucion.evoluciones.forEach(evolucion => {
                        let valor = evolucion.valores;
                        lista = findValues(valor, key);
                        if (lista.length > 0) {
                            listaValores = listaValores.concat(lista);
                        }
                    });

                    if (listaValores.length > 0) {
                        listakey.push({ 'valor': listaValores[listaValores.length - 1], 'fecha': prestacion.ejecucion.fecha });
                        listaValores = [];
                    }
                });
            }
            res.json(listakey);
        }
    });

});

function findValues(obj, key) {  // funcion para buscar una key y recuperar la prestacion que la contiene
    return findValuesHelper(obj, key, []);
}

function findValuesHelper(obj, key, list) {
    let i;
    let children;
    if (!obj) {
        return list;
    }
    if (obj instanceof Array) {
        for (i in obj) {
            list = list.concat(findValuesHelper(obj[i], key, []));
        }
        return list;
    }
    if (obj[key]) {
        list.push(obj[key]);
        return list;
    }

    if ((typeof obj === 'object') && (obj !== null)) {
        children = Object.keys(obj);
        if (children.length > 0) {
            for (i = 0; i < children.length; i++) {
                list = list.concat(findValuesHelper(obj[children[i]], key, []));
            }
        }
    }
    return list;
}

router.get('/prestaciones/:id*?', function (req, res, next) {
    let query;
    if (req.params.id) {
        query = prestacionPaciente.findById(req.params.id);
    } else {
        if (req.query.estado) {
            query = prestacionPaciente.find({
                $where: 'this.estado[this.estado.length - 1].tipo == "' + req.query.estado + '"'
            });
        } else {
            query = prestacionPaciente.find({}); // Trae todos
        }

        if (req.query.fechaDesde) {

            query.where('ejecucion.fecha').gte(req.query.fechaDesde);
        }

        if (req.query.fechaHasta) {
            query.where('ejecucion.fecha').lte(req.query.fechaHasta);
        }

        if (req.query.idProfesional) {
            query.where('estado.profesional._id').equals(req.query.idProfesional);
        }

        if (req.query.idTipoPrestacion) {
            query.where('solicitud.tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        }

        if (req.query.idPaciente) {
            query.where('paciente.id').equals(req.query.idPaciente);
        }

        if (req.query.idPrestacionOrigen) {
            query.where('idPrestacionOrigen').equals(req.query.idPrestacionOrigen);
        }

        if (req.query.turneables) {
            query.where('solicitud.tipoPrestacion.turneable').equals(true);
        }

        if (req.query.turnos) {
            // let idsTurnos = req.query.turnos.split(',');
            query.where('solicitud.idTurno').in(req.query.turnos);
        }
    }

    // populamos todo lo necesario de la solicitud luego del find
    query.populate({
        path: 'solicitud.listaProblemas',
        model: 'problema',
        // populate: {
        //     path: 'tipoProblema',
        //     model: 'tipoProblema'
        // }
    });
    query.populate({
        path: 'solicitud.tipoPrestacion.ejecucion',
        model: 'tipoPrestacion'
    });

    query.populate({
        path: 'solicitud.tipoPrestacion.ejecucion.prestaciones',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            // populate: {
            //     path: 'tipoProblema',
            //     model: 'tipoProblema'
            // }
        }
    });

    // populuamos todo lo necesario de la ejecucion
    query.populate({
        path: 'ejecucion.prestaciones',
        model: 'prestacionPaciente',
        populate: [{
            path: 'solicitud.listaProblemas',
            model: 'problema',
            // populate: {
            //     path: 'tipoProblema',
            //     model: 'tipoProblema'
            // },
        },
        {
            path: 'ejecucion.listaProblemas',
            model: 'problema',
            // populate: {
            //     path: 'tipoProblema',
            //     model: 'tipoProblema'
            // },
        }]
    });

    query.populate({
        path: 'ejecucion.listaProblemas',
        model: 'problema',
        // populate: {
        //     path: 'tipoProblema',
        //     model: 'tipoProblema'
        // }
    });

    query.populate({
        path: 'ejecucion.listaProblemas',
        model: 'problema',
        populate: {
            path: 'evoluciones.profesional',
            model: 'profesional'
        }
    });

    // populuamos las prestaciones a futuro
    query.populate({
        path: 'prestacionesSolicitadas',
        model: 'prestacionPaciente',
        populate: {
            path: 'solicitud.listaProblemas',
            model: 'problema',
            // populate: {
            //     path: 'tipoProblema',
            //     model: 'tipoProblema'
            // }
        }
    });

    query.sort({ 'solicitud.fecha': -1 });

    if (req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }


    query.exec(function (err, data) {
        if (err) {
            
            res.status(404).json({message: 'Prestación no encontrada'});

            next(404);
        };

        res.json(data);
    });
});



router.post('/prestaciones', function (req, res, next) {
    let prestacion;
    prestacion = new prestacionPaciente(req.body);

    Auth.audit(prestacion, req);
    prestacion.save((err) => {
        if (err) {
            return next(err);
        }

        res.json(prestacion);
    });
});


router.put('/prestaciones/:id', function (req, res, next) {
    let prestacion;
    prestacion = new prestacionPaciente(req.body);

    //let evolucion = prestacion.ejecucion.evoluciones[prestacion.ejecucion.evoluciones.length - 1];

    prestacionPaciente.findById(prestacion.id, function (err, data) {
        if (err) {
            return next(err);
        }

        /*
        let prest;
        prest = data;

        let evoluciones = prest.ejecucion.evoluciones;
        evoluciones.push(evolucion);
        prestacion.ejecucion.evoluciones = evoluciones;
        */
        Auth.audit(prestacion, req);

        prestacionPaciente.findByIdAndUpdate(prestacion.id, prestacion, {
            new: true
        }, function (err2, data2) {
            if (err2) {
                return next(err2);
            }
            res.json(data2);
        });
    });
});



router.patch('/prestaciones/:id', function (req, res, next) {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        next('ID inválido');
    }
    console.log(req.body);
    console.log(req.params.id);
    /*
        prestacionPaciente.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
    */
    let modificacion = {};

    switch (req.body.op) {
        case 'estado':
            if (req.body.estado) {
                modificacion = { '$set': { 'estado': req.body.estado } }
                // data.set('estado', req.body.estado);
            }
            break;
        case 'estadoPush':
            if (req.body.estado) {
                // modificacion = { '$push': { 'estado': { tipo: req.body.estado } } }
                modificacion = { '$push': { 'estado': req.body.estado } }
                // data['estado'].push(req.body.estado);
            }
            break;
        case 'listaProblemas':
            if (req.body.problema) {
                modificacion = { '$push': { 'ejecucion.listaProblemas': req.body.problema } }
                // data['ejecucion'].listaProblemas.push(req.body.problema);
            }
            break;
        case 'listaProblemasSolicitud':
            if (req.body.problema) {
                modificacion = { '$push': { 'solicitud.listaProblemas': req.body.problema } }
                // ata['solicitud'].listaProblemas.push(req.body.problema);
            }
            break;
        case 'desvincularProblema':
            if (req.body.idProblema) {
                modificacion = { '$pull': { 'ejecucion.listaProblemas': req.body.idProblema } };
            }
            break;
        // case 'desvincularPlan':
        //     if (req.body.idPrestacionFutura) {
        //         modificacion = { '$pull': { 'prestacionesSolicitadas': req.body.idPrestacionFutura } };
        //     }
        //     break;
        case 'desvincularPlan':
            if (req.body.idProblema) {
                modificacion = { '$pull': { 'solicitud.listaProblemas': req.body.idProblema } };
                console.log(modificacion);
            }
            break;
        default:
            next('Error: No se seleccionó ninguna opción.');
            break;
    }


    if (!modificacion) {
        return next('Opción inválida.');
    }


    // TODO: refactor findByIdAndUpdate
    // prestacionPaciente.findById(req.params.id, (errFind, data) => {

    //     if (errFind) {
    //         return next(errFind);
    //     }

    //     let pp = new prestacionPaciente(data);

    //     Auth.audit(pp, req);

    //     pp.save(modificacion, (errSave, data) => {
    //         if (errSave) {
    //             return next(errSave);
    //         }

    //         Logger.log(req, 'prestacionPaciente', 'update', {
    //             accion: req.body.op,
    //             ruta: req.url,
    //             method: req.method,
    //             data: data,
    //             err: errSave || false
    //         });

    //         res.json(data);

    //     });

    // });

    prestacionPaciente.findByIdAndUpdate(req.params.id, modificacion, { upsert: false }, function (err, data) {
        // data.update(req.params.id, modificacion, function (err, data) {
        if (err) {
            return next(err);
        }

        // Auth.audit(data, req);
        Logger.log(req, 'prestacionPaciente', 'update', {
            accion: req.body.op,
            ruta: req.url,
            method: req.method,
            data: data,
            err: err || false
        });

        res.json(data);
    });
});


router.delete('/prestaciones/:id', function (req, res, next) {
    prestacionPaciente.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
