/**
 * Schema definido en profesionalMeta.ts
 */

import * as express from 'express';
import * as mongoose from 'mongoose';
import { profesionalMeta } from './../schemas/profesionalMeta';

const router = express.Router();

router.get('/frecuentesProfesional/:id', (req, res, next) => {
    if (req.params.id) {
        const query = profesionalMeta.find({ 'profesional.id': req.params.id });
        query.exec((err, data: any) => {

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

router.get('/frecuentesProfesional', (req, res, next) => {


    if (!req.query.tipoPrestacion) {
        return next(404);
    }

    const query = {
        // profesional
        ...(req.query.idProfesional) && { 'profesional.id': mongoose.Types.ObjectId(req.query.idProfesional) },
        // organizacion
        ...(req.query.idOrganizacion) && { 'organizacion.id': mongoose.Types.ObjectId(req.query.idOrganizacion) },
        // tipoPrestacion
        ...(req.query.tipoPrestacion) && { 'tipoPrestacion.conceptId': req.query.tipoPrestacion }
    };


    const pipeline = [
        { $match: query },
        { $unwind: '$frecuentes' },
        { $project: { 'frecuentes.concepto': 1, 'frecuentes.frecuencia': 1, 'frecuentes.esSolicitud': 1, _id: 0 } },
        {
            $group: {
                _id: { conceptId: '$frecuentes.concepto.conceptId', term: '$frecuentes.concepto.term', fsn: '$frecuentes.concepto.fsn', semanticTag: '$frecuentes.concepto.semanticTag' },
                frecuencia: { $sum: '$frecuentes.frecuencia' },
                esSolicitud: { $last: '$frecuentes.esSolicitud' }
            }
        },
        { $sort: { frecuencia: -1, '_id.conceptId': 1 } },
        { $project: { _id: 0, concepto: '$_id', frecuencia: 1, esSolicitud: 1, } }
    ];
    profesionalMeta.aggregate(pipeline, (err, data) => {
        if (err) {
            next(err);
        }
        res.json(data);
    });


});

router.post('/frecuentesProfesional', (req, res, next) => {

    if (!req.body) {
        return next(400);
    }

    const data = new profesionalMeta(req.body);

    // Auth.audit(req.body, req);

    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.put('/frecuentesProfesional/:id*?', (req, res, next) => {
    const query = {
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
            const frecuente = new profesionalMeta(req.body);

            frecuente.save((err2) => {
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

                    const indexConcepto = resultado.frecuentes.findIndex(x => x.concepto.conceptId === frecuente.concepto.conceptId);

                    if (indexConcepto === -1) {
                        resultado.frecuentes.push(frecuente);
                    } else {
                        resultado.frecuentes[indexConcepto].frecuencia = parseInt(resultado.frecuentes[indexConcepto].frecuencia, 0) + 1;
                    }
                    // });
                });
            }

            resultado.save((err2, data2) => {
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
