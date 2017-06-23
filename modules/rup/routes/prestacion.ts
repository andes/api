import * as express from 'express';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { prestacion } from '../schemas/prestacion';

let router = express.Router();

router.get('/prestaciones/:id*?', function (req, res, next) {
    let query;
    let mensajeError = "";

    if (req.params.id) {
        query = prestacion.findById(req.params.id);

        mensajeError = "Prestación no encontrada";

    } else {
        if (req.query.estado) {
            query = prestacion.find({
                $where: 'this.estados[this.estados.length - 1].tipo == "' + req.query.estado + '"'
            });
        } else {
            query = prestacion.find({}); // Trae todos
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

        // if (req.query.idTipoPrestacion) {
        //     query.where('solicitud.tipoPrestacion._id').equals(req.query.idTipoPrestacion);
        // }

        if (req.query.idPaciente) {
            query.where('paciente.id').equals(req.query.idPaciente);
        }

        if (req.query.idPrestacionOrigen) {
            query.where('solicitud.idPrestacionOrigen').equals(req.query.idPrestacionOrigen);
        }

        if (req.query.turneables) {
            query.where('solicitud.tipoPrestacion.turneable').equals(true);
        }

        if (req.query.turnos) {
            // let idsTurnos = req.query.turnos.split(',');
            query.where('solicitud.idTurno').in(req.query.turnos);
        }
    }


    query.sort({ 'solicitud.fecha': -1 });

    if (req.query.limit) {
        query.limit(parseInt(req.query.limit, 10));
    }

    query.exec(function (err, data) {
        if (err) {

            res.status(404).json({ message: 'Prestación no encontrada' });

            next(404);
        };

        res.json(data);
    });
});



router.post('/prestaciones', function (req, res, next) {
    let unaPrestacion;
    console.log("Prestacion Body", req.body);
    unaPrestacion = new prestacion(req.body);

    Auth.audit(unaPrestacion, req);
    unaPrestacion.save((err) => {
        if (err) {
            console.log(err);
            return next(err);
        }

        res.json(unaPrestacion);
    });
});

router.patch('/prestaciones/:id', function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        next('ID inválido');
    }

    prestacion.findById(req.params.id, (err, data) => {
        if (err) {
            next(err);
        }

        let modificacion = {};
        switch (req.body.op) {
            case 'estado':
                if (req.body.estado) {
                    modificacion = { '$set': { 'estados': req.body.estado } }
                    // data.set('estado', req.body.estado);
                }
                break;
            case 'estadoPush':
                if (req.body.estado) {
                    // modificacion = { '$push': { 'estado': { tipo: req.body.estado } } }

                    //modificacion = { '$push': { 'estados': req.body.estado } }
                    data['estados'].push(req.body.estado);
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

        Auth.audit(data, req);
        //prestacion.findByIdAndUpdate(req.params.id, modificacion, { upsert: false }, function (err, data) {
        data.save(function (err, data) {
            if (err) {
                return next(err);
            }
            // Auth.audit(data, req);
            /*
            Logger.log(req, 'prestacionPaciente', 'update', {
                accion: req.body.op,
                ruta: req.url,
                method: req.method,
                data: data,
                err: err || false
            });
            */
            res.json(data);
        });
    });

    
});


router.put('/prestaciones/:id', function (req, res, next) {
    let prestacion;
    prestacion = new prestacion(req.body);

    //let evolucion = prestacion.ejecucion.evoluciones[prestacion.ejecucion.evoluciones.length - 1];

    prestacion.findById(prestacion.id, function (err, data) {
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

        prestacion.findByIdAndUpdate(prestacion.id, prestacion, {
            new: true
        }, function (err2, data2) {
            if (err2) {
                return next(err2);
            }
            res.json(data2);
        });
    });
});



router.delete('/prestaciones/:id', function (req, res, next) {
    prestacion.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
