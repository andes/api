import * as mongoose from 'mongoose';
import * as express from 'express';
import * as moment from 'moment';
// import * as async from 'async';
import { Auth } from './../../../auth/auth.class';
import { model as Prestacion } from '../schemas/prestacion';
import { model as PrestacionAdjunto } from '../schemas/prestacion-adjuntos';

import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import * as frecuentescrl from '../controllers/frecuentesProfesional';
import { NotificationService } from '../../mobileApp/controller/NotificationService';

import { iterate, convertToObjectId, buscarEnHuds, matchConcepts } from '../controllers/rup';
import { Logger } from '../../../utils/logService';

let router = express.Router();
let async = require('async');

router.get('/prestaciones/huds/:idPaciente', function (req, res, next) {

    // verificamos que sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.idPaciente)) {
        return res.status(404).send('Turno no encontrado');
    }

    // por defecto traemos todas las validadas, si no vemos el estado que viene en la request
    const estado = (req.query.estado) ? req.query.estado : 'validada';
    let query = {
        'paciente.id': req.params.idPaciente,
        '$where': 'this.estados[this.estados.length - 1].tipo ==  \"' + estado + '\"'
    };

    let conceptos = (req.query.conceptIds) ? req.query.conceptIds : null;

    return Prestacion.find(query, (err, prestaciones) => {
        if (err) {
            return next(err);
        }

        if (!prestaciones) {
            return res.status(404).send('Paciente no encontrado');
        }

        // ejecutamos busqueda recursiva
        let data = buscarEnHuds(prestaciones, conceptos);

        res.json(data);
    });
});

router.get('/prestaciones/:id*?', function (req, res, next) {
    if (req.params.id) {
        let query = Prestacion.findById(req.params.id);
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (!data) {
                return next(404);
            }
            res.json(data);
        });
    } else {
        let query;
        if (req.query.estado) {
            query = Prestacion.find({
                $where: 'this.estados[this.estados.length - 1].tipo ==  \"' + req.query.estado + '\"'
            });
        } else {
            query = Prestacion.find({}); // Trae todos
        }

        if (req.query.sinEstado) {
            query.where('estados.tipo').ne(req.query.sinEstado);
        }
        if (req.query.fechaDesde) {
            query.where('ejecucion.fecha').gte(moment(req.query.fechaDesde).startOf('day').toDate() as any);
        }
        if (req.query.fechaHasta) {
            query.where('ejecucion.fecha').lte(moment(req.query.fechaHasta).endOf('day').toDate() as any);
        }
        if (req.query.idProfesional) {
            query.where('solicitud.profesional.id').equals(req.query.idProfesional);
        }
        if (req.query.idPaciente) {
            query.where('paciente.id').equals(req.query.idPaciente);
        }
        if (req.query.idPrestacionOrigen) {
            query.where('solicitud.prestacionOrigen').equals(req.query.idPrestacionOrigen);
        }
        if (req.query.turnos) {
            query.where('solicitud.turno').in(req.query.turnos);
        }

        if (req.query.conceptsIdEjecucion) {
            query.where('ejecucion.registros.concepto.conceptId').in(req.query.conceptsIdEjecucion);
        }

        // Solicitudes generadas desde puntoInicio Ventanilla
        // Solicitudes que no tienen prestacionOrigen ni turno
        // Si tienen prestacionOrigen son generadas por RUP y no se listan
        // Si tienen turno, dejan de estar pendientes de turno y no se listan
        if (req.query.tienePrestacionOrigen === 'no') {
            query.where('solicitud.prestacionOrigen').equals(null);
        }
        if (req.query.tieneTurno === 'no') {
            query.where('solicitud.turno').equals(null);
        }

        if (req.query.organizacion) {
            query.where('solicitud.organizacion.id').equals(req.query.organizacion);
        }

        // Ordenar por fecha de solicitud
        if (req.query.ordenFecha) {
            query.sort({ 'solicitud.fecha': -1 });
        } else if (req.query.ordenFechaEjecucion) {
            query.sort({ 'ejecucion.fecha': -1 });
        }

        if (req.query.limit) {
            query.limit(parseInt(req.query.limit, 10));
        }
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            if (req.params.id && !data) {
                return next(404);
            }
            res.json(data);
        });
    }
});

router.post('/prestaciones', function (req, res, next) {
    let data = new Prestacion(req.body);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/prestaciones/:id', function (req, res, next) {
    Prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            return next(err);
        }

        switch (req.body.op) {
            case 'paciente':
                if (req.body.paciente) {
                    data.paciente = req.body.paciente;
                }
                break;
            case 'estadoPush':
                if (req.body.estado) {
                    if (data.estados[data.estados.length - 1].tipo === 'validada') {
                        return next('Prestación validada, no puede volver a validar.');
                    }
                    data['estados'].push(req.body.estado);
                }
                if (req.body.registros) {
                    data.ejecucion.registros = req.body.registros;
                }
                break;
            case 'romperValidacion':
                if (data.estados[data.estados.length - 1].tipo !== 'validada') {
                    return next('Para poder romper la validación, primero debe validar la prestación.');
                }

                if ((req as any).user.usuario.username !== data.estados[data.estados.length - 1].createdBy.documento) {
                    return next('Solo puede romper la validación el usuario que haya creado.');
                }

                data.estados.push(req.body.estado);
                break;
            case 'registros':
                if (req.body.registros) {
                    data.ejecucion.registros = req.body.registros;
                }
                break;
            case 'asignarTurno':
                if (req.body.idTurno) {
                    data.solicitud.turno = req.body.idTurno;
                }
                break;
            default:
                return next(500);
        }

        Auth.audit(data, req);
        data.save(function (error, prestacion) {
            if (error) {
                return next(error);
            }

            // Actualizar conceptos frecuentes por profesional y tipo de prestacion
            if (req.body.registrarFrecuentes && req.body.registros) {

                let dto = {
                    profesional: Auth.getProfesional(req),
                    tipoPrestacion: prestacion.solicitud.tipoPrestacion,
                    organizacion: prestacion.solicitud.organizacion,
                    frecuentes: req.body.registros
                };
                frecuentescrl.actualizarFrecuentes(dto)
                    .then((resultadoFrec: any) => {
                        Logger.log(req, 'rup', 'update', {
                            accion: 'actualizarFrecuentes',
                            ruta: req.url,
                            method: req.method,
                            data: req.body.listadoFrecuentes,
                            err: false
                        });
                    })
                    .catch((errFrec) => {
                        return next(errFrec);
                    });

            }

            if (req.body.planes) {
                // creamos una variable falsa para cuando retorne hacer el get
                // de todas estas prestaciones

                let solicitadas = [];

                async.each(req.body.planes, function (plan, callback) {
                    let nuevoPlan = new Prestacion(plan);

                    Auth.audit(nuevoPlan, req);
                    nuevoPlan.save(function (errorPlan, nuevaPrestacion) {
                        if (errorPlan) { return callback(errorPlan); }

                        solicitadas.push(nuevaPrestacion);

                        callback();

                    });
                }, function (err2) {
                    if (err2) {
                        return next(err2);
                    }

                    // como el objeto de mongoose es un inmutable, no puedo agregar directamente una propiedad
                    // para poder retornar el nuevo objeto con los planes solicitados, primero
                    // debemos clonarlo con JSON.parse(JSON.stringify());
                    let convertedJSON = JSON.parse(JSON.stringify(prestacion));
                    convertedJSON.solicitadas = solicitadas;
                    res.json(convertedJSON);
                });

            } else {
                res.json(prestacion);
            }

            Auth.audit(data, req);
            /*
            Logger.log(req, 'prestacionPaciente', 'update', {
                accion: req.body.op,
                ruta: req.url,
                method: req.method,
                data: data,
                err: err || false
            });
            */
        });
    });
});

export = router;
