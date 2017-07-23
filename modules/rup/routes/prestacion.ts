import { paciente } from './../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';
import { model as prestacion } from '../schemas/prestacion';

let router = express.Router();

router.get('/prestaciones/:id*?', function (req, res, next) {
    if (req.params.id) {
        let query = prestacion.findById(req.params.id);
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
        let query: mongoose.DocumentQuery<mongoose.Document[], mongoose.Document>;
        let filtrosEstado = 'true ';
        if (req.query.estado) {
            filtrosEstado += ' && this.estados[this.estados.length - 1].tipo == "' + req.query.estado + '"';
        }

        if (req.query.fechaDesde) {
            filtrosEstado += ' && this.estados[this.estados.length - 1].createdAt >= new ISODate("' + req.query.fechaDesde + '")';
        }

        if (req.query.fechaHasta) {
            filtrosEstado += ' && this.estados[this.estados.length - 1].createdAt <= new ISODate("' + req.query.fechaHasta + '")';
            //query.where['this.estados[this.estados.length - 1].createdAt'].lte(req.query.fechaHasta);
        }


        if (filtrosEstado !== 'true ') {
            query = prestacion.find({
                $where: filtrosEstado
            });
        } else {
            query = prestacion.find({}); // Trae todos
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
            query.where('solicitud.idTurno').in(req.query.turnos);
        }

        // Ordenar por fecha de solicitud
        if (req.query.ordenFecha) {
            query.sort({ 'estados.createdAt': -1 });
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
    let data = new prestacion(req.body);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/prestaciones/:id', function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        next('ID inválido');
    }

    prestacion.findById(req.params.id, (err, data: any) => {
        if (err) {
            next(err);
        }

        let modificacion = {};
        switch (req.body.op) {

            case 'paciente':
                if (req.body.paciente) {
                    data.paciente = req.body.paciente;
                    // modificacion = { '$set': { 'paciente': req.body.paciente } }
                    // data.set('estado', req.body.estado);
                }
                break;
            /*
            case 'estado':
                if (req.body.estado) {
                    modificacion = { '$set': { 'estados': req.body.estado } }
                    // data.set('estado', req.body.estado);
                }
                break;
            */
            case 'estadoPush':
                if (req.body.estado) {
                    if (data.estados[data.estados.length - 1].tipo === 'validada') {
                        return next('Prestación validada, no puede volver a validar.');
                    }
                    // modificacion = { '$push': { 'estado': { tipo: req.body.estado } } }

                    // modificacion = { '$push': { 'estados': req.body.estado } }
                    data['estados'].push(req.body.estado);
                }
                break;
            case 'romperValidacion':
                if (data.estados[data.estados.length - 1].tipo !== 'validada') {
                    return next('Para poder romper la validación, primero debe validar la prestación.');
                }

                if ((req as any).user.usuario.username !== data.estados[data.estados.length - 1].createdBy.documento) {
                    return next('Solo puede romper la validación el usuario que haya creado.');
                }

                data['estados'].push(req.body.estado);
                break;
            case 'registros':
                if (req.body.registros) {
                    data.ejecucion.registros = req.body.registros;
                }
                break;
            default:
                return next('Error: No se seleccionó ninguna opción.');
        }

        if (!modificacion) {
            return next('Opción inválida.');
        }

        Auth.audit(data, req);
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

export = router;
