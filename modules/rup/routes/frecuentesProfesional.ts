/**
 * Schema definido en profesionalMeta.ts
 */

import { log } from './../../../core/log/schemas/log';
import * as express from 'express';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
// import * as async from 'async';
import { Auth } from './../../../auth/auth.class';
import { profesional } from './../../../core/tm/schemas/profesional';
import { profesionalMeta } from './../schemas/profesionalMeta';

let router = express.Router();
let async = require('async');

router.get('/frecuentesProfesional/:id', function (req, res, next) {
    if (req.params.id) {
        let query = profesionalMeta.find({ 'profesional.id': req.params.id });
        query.exec(function (err, data: any) {

            if (err) {
                return next(err);
            }

            if (!data) {
                return next(404);
            }

            if (data[0] && data[0].frecuentes) {
                data[0].frecuentes.sort((a, b) => a.frecuencia - b.frecuencia);
            }

            res.json(data);
        });
    } else {
        res.json({ message: 'no hay ID!' });
    }
});

router.get('/frecuentesProfesional', function (req, res, next) {

    let query = {
        // profesional
        ...(req.query.idProfesional) && { 'profesional.id': req.query.idProfesional },
        // organizacion
        ...(req.query.idOrganizacion) && { 'organizacion.id': req.query.idOrganizacion },
        // tipoPrestacion
        ...(req.query.tipoPrestacion) && { 'tipoPrestacion.conceptId': req.query.tipoPrestacion }
    };

    profesionalMeta.find(query, (err, data: any) => {

        if (err) {
            return next(err);
        }

        if (!data) {
            return next(404);
        }

        if (data[0] && data[0].frecuentes) {
            data[0].frecuentes.sort((a, b) => b.frecuencia - a.frecuencia);
        }

        res.json(data);
    });
});

router.post('/frecuentesProfesional', function (req, res, next) {

    if (!req.body) {
        return next(400);
    }

    let data = new profesionalMeta(req.body);

    // Auth.audit(req.body, req);

    data.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.put('/frecuentesProfesional/:id*?', function (req, res, next) {
    let query = {
        // profesional
        ...(req.params.id) && { 'profesional.id': req.params.id },
        // organizacion
        ...(req.body.organizacion.id) && { 'organizacion.id': req.body.organizacion.id },
        // tipoPrestacion
        ...(req.body.tipoPrestacion.conceptId) && { 'tipoPrestacion.conceptId': req.body.tipoPrestacion.conceptId }
    };

    profesionalMeta.findOne(query, (err, resultado: any) => {
        if (err) {
            return next(err);
        }

         // si no existe agregamos el nuevo frecuente
         if (typeof resultado === null || !resultado) {
            let frecuente = new profesionalMeta(req.body);

            frecuente.save(function (err2) {
                if (err2) {
                    // return res.json(err2);
                    return next(err2);
                }

                res.json(resultado);
            });

        } else {

            if (req.body.frecuentes) {
                req.body.frecuentes.forEach(frecuente => {
                    // frecuente.conceptos.forEach(concepto => {

                        let indexConcepto = resultado.frecuentes.findIndex(x => x.concepto.conceptId === frecuente.concepto.conceptId);

                        if (indexConcepto === -1) {
                            resultado.frecuentes.push(frecuente);
                        } else {
                            resultado.frecuentes[indexConcepto].frecuencia = parseInt(resultado.frecuentes[indexConcepto].frecuencia, 0) + 1;
                        }
                    // });
                });
            }

            resultado.save( (err2, data2) => {
                if (err2) {
                    return next(err);
                }
                res.json(data2);
            });
        }
    });
});

// router.patch('/frecuentesProfesional/:id', function (req, res, next) {
//     profesionalMeta.find({ 'profesional._id': req.params.id }, function (err, data: any) {
//         if (err) {
//             return next(err);
//         }

//         data.frecuentes = data.map(x => {
//             return x.frecuentes.find(f => {
//                 return f.frecuencia = (f.concepto.conceptId === req.body.conceptId ? f.frecuencia + 1 : f.frecuencia);
//             });
//         });


//         Auth.audit(data, req);

//         data.save(function (error, frecuente) {
//             if (error) {
//                 return next(error);
//             }
//             res.json(frecuente);
//         });
//     });
// });

export = router;
