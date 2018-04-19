import * as express from 'express';
import * as turno from '../schemas/turno';
 import{ profesional } from '../../../core/tm/schemas/profesional';
import { turnoSolicitado } from '../schemas/turnoSolicitado';
import { Auth } from '../../../auth/auth.class';
let router = express.Router();


router.post('/turnos/save/:turnoId', function(request, response, errorHandler) {

    turno.findByIdAndUpdate(request.params.turnoId, request.body, { new: true }, (err, res) => {
        if (err) {
            return errorHandler(err);
        }

        response.status(201)
            .json(res);
    });

});


router.post('/turnos/:tipo/:profesionalId/', function(request, response, errorHandler) {

    // Convert date to user datetime.
    let  fechaTurno = new Date(request.body.turno.fecha);
    if (request.body.sobreTurno) {
            profesional.findById(request.params.profesionalId, function(error, datos) {
        let nTurno = new turno({
            fecha: fechaTurno,
            tipo: request.body.turno.tipo,
            profesional: datos
        });

        nTurno.save((err) => {
            if (err) {
                errorHandler(err);
            }

            response.json(nTurno);
        });
    });
    } else {

    turnoSolicitado.findById(request.params.profesionalId, function(error, datos) {
        let nTurno = new turno({
            fecha: fechaTurno,
            tipo: request.body.turno.tipo,
            profesional: datos
        });

        nTurno.save((err) => {
            if (err) {
                errorHandler(err);
            }

            response.json(nTurno);
        });
    });
}
});


/**
 * Listado de Turnos
 */
router.get('/turnos/proximos/?', Auth.authenticate() , function(request: any, response, errorHandler) {
    if (!Auth.check(request, 'matriculaciones:turnos:*')) {
        return errorHandler(403);
    }
    let offset = parseInt(request.query.offset, 0);
    let chunkSize = parseInt(request.query.size, 0);

    let responseData = {
        totalPages: null,
        data: null
    };

    let fechaConsulta;
    if (request.query.fecha) {
        fechaConsulta = new Date(request.query.fecha);
        fechaConsulta.setHours(0);
        fechaConsulta.setMinutes(0);
        fechaConsulta.setMilliseconds(0);

    } else {
        let hoy = new Date();
       let fechaActualMargen = hoy.setMinutes(hoy.getMinutes() - 30);
        fechaConsulta = fechaActualMargen;
    }

    let busquedaTurno = {
        fecha: { $gte: fechaConsulta }

    };

    if (request.query.nombre || request.query.apellido || request.query.documento ) {

        let busquedaProfesional = {};

        if (request.query.nombre) {
            busquedaProfesional['nombre'] = new RegExp(request.query.nombre, 'i');
        }

        if (request.query.apellido) {
            busquedaProfesional['apellido'] = new RegExp(request.query.apellido, 'i');
        }

        if (request.query.documento) {
            busquedaProfesional['documento'] = new RegExp(request.query.documento, 'i');
        }


        turnoSolicitado.find(busquedaProfesional).select('_id').exec(function(errProf, profesionales) {

            if (errProf) {
                return errorHandler(errProf);
            }

            let profesionalesIds = profesionales.map(function(item, idx) {
                return item._id;
            });

            busquedaTurno['profesional'] = { $in: profesionalesIds };

            turno.find(busquedaTurno).populate('profesional')
                .sort({fecha: 1, hora: 1})
                .skip(offset)
                .limit(chunkSize)
                .exec((errTurno, data) => {
                    responseData.data = data;

                    if (errTurno) {
                        return errorHandler(errTurno);
                    }

                    turno.count(busquedaTurno).populate('profesional').exec(function(error, count) {
                        responseData.totalPages = Math.ceil(count / chunkSize) !== 0 ? Math.ceil(count / chunkSize) : 1;

                        if (error) {
                            return errorHandler(error);
                        }

                        response.status(201).json(responseData);
                    });
            });
        });

    } else {

        turno.find(busquedaTurno).populate('profesional')
            .sort({fecha: 1, hora: 1})
            .skip(offset)
            .limit(chunkSize)
            .exec((error, data) => {

                responseData.data = data;

                turno.count(busquedaTurno).populate('profesional').exec(function(err, count) {
                    responseData.totalPages = Math.floor(count / chunkSize);

                    if (error) {
                        return errorHandler(error);
                    }
                    response.status(201).json(responseData);
                });
        });
    }
});


/**
 * Devuelve los turnos del tipo y mes pasados por parametro.
 */
router.get('/turnos/:tipo/?', function(request, response, errorHandler) {

    let matchObj = {
        tipo: request.params.tipo
    };

    if (request.query.anio) {
        matchObj['anio'] = parseInt(request.query.anio, 0);
    }

    if (request.query.mes) {
        matchObj['mes'] = parseInt(request.query.mes, 0);
    }

    if (request.query.dia) {
        matchObj['dia'] = parseInt(request.query.dia, 0);
    }


    if (!request.query.dia) {
        turno.aggregate(
            [{
                $project: {
                    tipo: true,
                    fecha: true,
                    anio: {  $year: '$fecha' },
                    mes: { $month: '$fecha'},
                    dia: { $dayOfMonth: '$fecha' }
                    // hora: { $hour: '$fecha' },
                    // minutos: { $minute: '$fecha'}
                }
            }, {
                $match: matchObj
            }, {
                $group: {
                    _id: {
                        // tipo: '$tipo',
                        // fecha: '$fecha',
                        // anio: { $year: '$fecha' },
                        // mes: { $month: '$fecha' },
                        // dia: { $dayOfMonth: '$fecha' },
                        fechaStr: { $concat: [{ $substr: ['$dia', 0 , -1] }, '/', { $substr: ['$mes', 0 , -1] }, '/', { $substr: ['$anio', 0 , -1] }] }
                        // hora: { $hour: '$fecha' },
                        // minutos: { $minute: '$fecha'}
                    },
                    count: { $sum: 1}
                }
            }], (error, datos) => {

                if (error) {
                    return errorHandler(error);
                }

                response.status(201).json(datos);
        });

    } else {

        turno.aggregate(
            [{
                $project: {
                    tipo: true,
                    fecha: true,
                    anio: { $year: '$fecha' },
                    mes: { $month: '$fecha' },
                    dia: { $dayOfMonth: '$fecha' },
                    horaTimeOffset: { $subtract: [ '$fecha', 3 * 60 * 60 * 1000 ] },
                    minutos: { $minute: '$fecha' }
                }
            }, {
                $match: matchObj
            }, {
                $group: {
                    _id: {
                        // tipo: '$tipo',
                        // fecha: '$fecha',
                        mes: { $month: '$fecha' },
                        anio: { $year: '$fecha' },
                        dia: { $dayOfMonth: '$fecha' },
                        hora: { $hour: '$horaTimeOffset' },
                        minutos: { $minute: '$fecha'}
                        // dateDifference: { $hour: '$dateDifference'}
                    },
                    count: { $sum: 1 }
                }
            }], (error, datos) => {

                if (error) {
                    return errorHandler(error);
                }

                response.status(201).json(datos);
        });
    }
});


/**
 * /turnos/:id
 */
router.get('/turnos/:id*?', Auth.authenticate(), function (req, res, errorHandler) {

    if (!Auth.check(req, 'matriculaciones:turnos:getTurno')) {
        return errorHandler(403);
    }
    if (req.params.id) {
        turno.findById(req.params.id, function (err, data) {
            if (err) {
                return errorHandler(err);
            }

            res.json(data);
        });

    } else {
        let opciones = {};

        if (req.query.fecha) {
            opciones['fecha'] = req.query.fecha;
        }

        turno.find(opciones).populate('profesional').sort({fecha: 1, hora: 1}).exec((error, data) => {
            if (error) {
                return errorHandler(error);
            }

            res.json(data);
        });
   }
});


router.patch('/turnos/:id?', function (req, res, next) {
    turno.findById(req.params.id, function (err, resultado: any) {
        if (resultado) {
            switch (req.body.op) {
                case 'updateNotificado':
                    resultado.notificado = req.body.data;
                    break;
            }
        }

        resultado.save((err2) => {
            if (err2) {
                next(err2);
            }
            res.json(resultado);
        });


    });
});


export = router;
