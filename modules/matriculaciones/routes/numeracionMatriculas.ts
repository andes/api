import * as express from 'express';
import * as NumeracionMatriculas from './../schemas/numeracionMatriculas';
import numeracionMatriculas = require('../../../modules/matriculaciones/schemas/numeracionMatriculas');
import * as controller from '../controller/matriculaciones';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/numeraciones', Auth.authenticate(), (req, res, next) => {
    if (req.query.especialidad || req.query.profesion) {
        if (req.query.profesion) {
            NumeracionMatriculas.find({ 'profesion._id': req.query.profesion }, (err, data) => {
                if (err) {
                    next(err);
                }
                res.json(data);
            });
        }
        if (req.query.especialidad) {
            NumeracionMatriculas.find({ 'especialidad._id': req.query.especialidad }, (err, data) => {
                if (err) {
                    next(err);
                }
                res.json(data);
            });
        }
    } else {

        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const chunkSize = parseInt(req.query.size, 10);

        const responseData = {
            totalPages: null,
            data: null
        };

        const busquedaNumeracion = {};
        if (req.query.codigo) {
            busquedaNumeracion['profesion.codigo'] = req.query.codigo;
        }
        if (req.query.codigoEspecialidad) {
            busquedaNumeracion['especialidad.codigo'] = req.query.codigoEspecialidad;
        }

        if (req.query.codigoSisa) {
            busquedaNumeracion['profesion.codigo'] = req.query.codigoSisa;
        }

        if (req.query.codigoSisaEspecialidad) {
            busquedaNumeracion['especialidad.codigo'] = req.query.codigoSisaEspecialidad;
        }

        NumeracionMatriculas.find(busquedaNumeracion)
            .skip(offset)
            .limit(chunkSize)
            .exec((error, data) => {

                if (error) {
                    return next(error);
                }

                responseData.data = data;

                NumeracionMatriculas.count(busquedaNumeracion)
                    .exec((error2, count) => {

                        if (error2) {
                            return next(error2);
                        }

                        responseData.totalPages = Math.ceil(count / chunkSize) !== 0 ? Math.ceil(count / chunkSize) : 1;
                        res.status(201)
                            .json(responseData);
                    });
            });
    }
});

router.post('/numeraciones', Auth.authenticate(), (request, response, errorHandler) => {
    const opciones = {};

    if (request.body.profesion) {
        opciones['profesion._id'] = request.body.profesion._id;
    }

    if (request.body.especialidad) {
        opciones['especialidad._id'] = request.body.especialidad._id;
    }

    const query = NumeracionMatriculas.find(opciones);

    query.exec((err, data) => {
        if (data.length > 0) {
            response.send(null);
        } else {
            const newNum = new NumeracionMatriculas(request.body);

            newNum.save((error, numeracion) => {

                if (error) {
                    return errorHandler(error);
                }

                response.status(201)
                    .json(numeracion);
            });
        }
    });
});

router.put('/numeraciones', Auth.authenticate(), (request, response, errorHandler) => {
    NumeracionMatriculas.findByIdAndUpdate(request.body.id, request.body, (error, numeracion) => {

        if (error) {
            return errorHandler(error);
        }

        response.json(numeracion);
    });
});

router.get('/ultimoPosgrado', Auth.authenticate(), async (req, res, next) => {
    const ultimoNumero = await controller.ultimoPosgrado();
    res.json(ultimoNumero);
});

router.patch('/ultimoPosgrado', Auth.authenticate(), async (req, res, next) => {
    const query = controller.query;
    let set;
    if (req.body.proximoNumero) {
        set = req.body;
    } else {
        const proximoNumero = await controller.ultimoPosgrado();
        set = { proximoNumero: proximoNumero + 1 };
    }
    const data: any = await numeracionMatriculas.updateOne(query, { $set: set });
    res.json(data);
});

export = router;
