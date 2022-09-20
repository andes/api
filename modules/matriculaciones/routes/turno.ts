import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { Profesional } from '../../../core/tm/schemas/profesional';
import * as turno from '../schemas/turno';
import { turnoSolicitado } from '../schemas/turnoSolicitado';
import { userScheduler } from '../../../config.private';
const router = express.Router();

router.patch('/turnos/save/:turnoId', Auth.authenticate(), async (request, response, next) => {
    try {
        const turnoFound = await turno.findById(request.params.turnoId);
        for (const key of Object.keys(request.body)) {
            turnoFound[key] = request.body[key];
        }
        Auth.audit(turnoFound, request);
        await turnoFound.save();
        response.status(201).json(turnoFound);
    } catch (err) {
        return next(err);
    }
});


router.post('/turnos/:tipo/:profesionalId/', async (req, res, next) => {
    // Convert date to user datetime.
    try {
        const fechaTurno = new Date(req.body.turno.fecha);
        const busquedaTurno = {
            $and: [
                { anulado: { $exists: false } },
                { fecha: fechaTurno }
            ]
        };
        const turnos = await turno.find(busquedaTurno);
        if (!turnos.length) {
            let datos = null;
            const profesionalId = req.params.profesionalId;

            if (req.body.sobreTurno) {
                datos = await Profesional.findById(profesionalId);
            } else {
                datos = await turnoSolicitado.findById(profesionalId);
            }

            if (datos) {
                const nTurno = new turno({
                    fecha: fechaTurno,
                    tipo: req.body.turno.tipo,
                    profesional: datos
                });
                Auth.audit(nTurno, userScheduler as any);
                await nTurno.save();
                return res.json(nTurno);
            }
        } else {
            return next('El horario seleccionado ya no se encuentra disponible.');
        }
    } catch (err) {
        return next(err);
    }
});

router.get('/turnos/turnosPorDocumentos', async (req, res, errorHandler) => {

    if (req.query.documento) {
        if (req.query.tipoTurno === 'matriculacion') {
            turno.find({ fecha: { $gte: new Date() }, anulado: { $exists: false } }).populate({
                path: 'profesional',
                match: { documento: req.query.documento, sexo: req.query.sexo }
            }).exec((error, data) => {
                if (error) {
                    return errorHandler(error);
                }
                const data2 = data.filter((x: any) => x.profesional !== null);

                if (data2) {
                    res.send(data2);

                } else {
                    res.send(data2);
                }
            });
        } else {
            const data = await turno.find({ fecha: { $gte: new Date() }, anulado: { $exists: false } }).populate({
                path: 'profesional',
                match: { documento: req.query.documento }
            });
            const data2 = data.filter((x: any) => x.profesional !== null);

            const match = data2.length > 0 ? data2[0] : [];

            res.send(match);

        }
    }
});

/**
 * Listado de Turnos
 */
router.get('/turnos/proximos/?', Auth.authenticate(), (request: any, response, errorHandler) => {
    if (!Auth.check(request, 'matriculaciones:turnos:*')) {
        return errorHandler(403);
    }
    const offset = parseInt(request.query.offset || 0, 10);
    const chunkSize = parseInt(request.query.size || 0, 10);
    const responseData = {
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
        const hoy = new Date();
        const fechaActualMargen = hoy.setMinutes(hoy.getMinutes() - 30);
        fechaConsulta = fechaActualMargen;
    }

    const busquedaTurno = {
        fecha: { $gte: fechaConsulta }

    };
    busquedaTurno['anulado'] = { $exists: false };
    if (request.query.nombre || request.query.apellido || request.query.documento) {

        const busquedaProfesional = {};

        if (request.query.nombre) {
            busquedaProfesional['nombre'] = new RegExp(request.query.nombre, 'i');
        }

        if (request.query.apellido) {
            busquedaProfesional['apellido'] = new RegExp(request.query.apellido, 'i');
        }

        if (request.query.documento) {
            busquedaProfesional['documento'] = new RegExp(request.query.documento, 'i');
        }


        turnoSolicitado.find(busquedaProfesional).select('_id').exec((errProf, profesionales) => {

            if (errProf) {
                return errorHandler(errProf);
            }

            const profesionalesIds = profesionales.map((item, idx) => {
                return item._id;
            });

            busquedaTurno['profesional'] = { $in: profesionalesIds };

            turno.find(busquedaTurno).populate('profesional')
                .sort({ fecha: 1, hora: 1 })
                .skip(offset)
                .limit(chunkSize)
                .exec((errTurno, data) => {
                    responseData.data = data;

                    if (errTurno) {
                        return errorHandler(errTurno);
                    }

                    turno.count(busquedaTurno).populate('profesional').exec((error, count) => {
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
            .sort({ fecha: 1, hora: 1 })
            .skip(offset)
            .limit(chunkSize)
            .exec((error, data) => {

                responseData.data = data;

                turno.count(busquedaTurno).populate('profesional').exec((err, count) => {
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
router.get('/turnos/:tipo/?', async (req, response, errorHandler) => {
    if (req.query.fecha) {
        const fecha = new Date(req.query.fecha);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;
        const aggregate = await turno.aggregate(
            [
                {
                    $match: {
                        anulado: { $exists: false }
                    }
                },
                {
                    $project: {
                        doc: '$$ROOT',
                        tipo: true,
                        fecha: true,
                        notificado: true,
                        sePresento: true,
                        profesional: true,
                        anulado: true,
                        year: {
                            $year: '$fecha'
                        },
                        month: {
                            $month: '$fecha'
                        },
                        day: {
                            $dayOfMonth: '$fecha'
                        }
                    }
                },
                {
                    $match: {
                        month: mes,
                        year: anio
                    }
                }
            ]);

        response.json(aggregate);
        return;


    }
    const matchObj = {
        // comentado para diferenciar los diferentes tipo de turnos y filtrar por lo mismo
        // tipo: request.params.tipo
    };
    // matchObj['anulado'] = { $exists: false };
    if (req.query.anio) {
        matchObj['anio'] = parseInt(req.query.anio, 10);
    }

    if (req.query.mes) {
        matchObj['mes'] = parseInt(req.query.mes, 10);
    }

    if (req.query.dia) {
        matchObj['dia'] = parseInt(req.query.dia, 10);
    }

    if (!req.query.dia) {
        const aggregate = await turno.aggregate(
            [
                {
                    $match: {
                        anulado: { $exists: false }
                    }
                },
                {
                    $project: {
                        tipo: true,
                        fecha: true,
                        anio: { $year: '$fecha' },
                        mes: { $month: '$fecha' },
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
                            fechaStr: { $concat: [{ $substr: ['$dia', 0, -1] }, '/', { $substr: ['$mes', 0, -1] }, '/', { $substr: ['$anio', 0, -1] }] }
                            // hora: { $hour: '$fecha' },
                            // minutos: { $minute: '$fecha'}
                        },
                        count: { $sum: 1 }
                    }
                }]);

        response.json(aggregate);

    } else {
        const aggregate = await turno.aggregate(
            [
                {
                    $match: {
                        anulado: { $exists: false }
                    }
                },
                {
                    $project: {
                        tipo: true,
                        fecha: true,
                        anio: { $year: '$fecha' },
                        mes: { $month: '$fecha' },
                        dia: { $dayOfMonth: '$fecha' },
                        horaTimeOffset: { $subtract: ['$fecha', 3 * 60 * 60 * 1000] },
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
                            minutos: { $minute: '$fecha' }
                            // dateDifference: { $hour: '$dateDifference'}
                        },
                        count: { $sum: 1 }
                    }
                }]);

        response.json(aggregate);
    }
});


/**
 * /turnos/:id
 */
router.get('/turnos/:id*?', Auth.authenticate(), (req, res, errorHandler) => {

    if (!Auth.check(req, 'matriculaciones:turnos:getTurno')) {
        return errorHandler(403);
    }
    if (req.params.id) {
        turno.findById(req.params.id, (err, data) => {
            if (err) {
                return errorHandler(err);
            }

            res.json(data);
        });

    } else {
        const opciones = {};

        if (req.query.fecha) {
            opciones['fecha'] = req.query.fecha;
        }

        turno.find(opciones).populate('profesional').sort({ fecha: 1, hora: 1 }).exec((error, data) => {
            if (error) {
                return errorHandler(error);
            }

            res.json(data);
        });
    }
});


export = router;
