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

router.get('/frecuentesProfesional/:id*?', function (req, res, next) {
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

    let query = profesionalMeta.find({});

    query.where('profesional.id', req.params.id);

    query.exec((err, resultado: any) => {
        if (err) {
            return next(err);
        }

        if (resultado[0] && resultado[0]._id) {

            if (resultado && resultado[0] && resultado[0].frecuentes) {
                resultado[0].frecuentes.forEach(fr => {
                    if (req.body.frecuentes.filter(x => x.concepto.conceptId === fr.concepto.conceptId).length > 1) {
                        req.body.splice(req.body.frecuentes.findIndex(y => y.concepto.conceptId === fr.concepto.conceptId), 1);
                    } else {
                        fr.frecuencia++;
                        req.body.frecuentes.push(fr);
                    }
                });
            }


            profesionalMeta.findByIdAndUpdate(resultado[0]._id, req.body, function (err2, data2) {
                if (err2) {
                    return next(err);
                }
                res.json(data2);
            });
        } else {

            let neu = new profesionalMeta(req.body);

            neu.save(function (err2) {
                if (err2) {
                    res.json(err2);
                } else {
                    res.json(resultado);
                }

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
