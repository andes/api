/**
 * Schema definido en profesionalMeta.ts
 */

import * as express from 'express';
import * as mongoose from 'mongoose';
import { ProfesionalMeta } from './../schemas/profesionalMeta';
import { toArray } from '../../../utils/utils';

const router = express.Router();

router.get('/frecuentesProfesional/:id', async (req, res, next) => {
    try {
        const frecuente = await ProfesionalMeta.find({ 'profesional.id': req.params.id });

        if (!frecuente) {
            return next(404);
        }

        if (frecuente[0] && frecuente[0].frecuentes) {
            frecuente[0].frecuentes.sort((a, b) => a.frecuencia - b.frecuencia);
        }

        return res.json(frecuente);
    } catch (err) {
        return next(err);
    }
});

router.get('/frecuentesProfesional', async (req, res, next) => {
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
                _id: {
                    conceptId: '$frecuentes.concepto.conceptId',
                    term: '$frecuentes.concepto.term',
                    fsn: '$frecuentes.concepto.fsn',
                    semanticTag: '$frecuentes.concepto.semanticTag'
                },
                frecuencia: { $sum: '$frecuentes.frecuencia' },
                esSolicitud: { $last: '$frecuentes.esSolicitud' }
            }
        },
        { $sort: { frecuencia: -1, '_id.conceptId': 1 } },
        { $project: { _id: 0, concepto: '$_id', frecuencia: 1, esSolicitud: 1, } }
    ];

    try {
        const frecuente = await toArray(ProfesionalMeta.aggregate(pipeline).cursor({}).exec());
        res.json(frecuente);
    } catch (err) {
        return next(err);
    }

});

/**
 * No esta en uso
 * [Deprecated]
 */
router.post('/frecuentesProfesional', async (req, res, next) => {

    if (!req.body) {
        return next(400);
    }

    const frecuente = new ProfesionalMeta(req.body);
    try {
        frecuente.save();
        return res.json(frecuente);
    } catch (err) {
        return next(err);
    }

});

/**
 * No esta en uso
 * [Deprecated]
 */
router.put('/frecuentesProfesional/:id', async (req, res, next) => {
    const query = {
        // profesional
        ...(req.params.id) && { 'profesional.id': req.params.id },
        // organizacion
        ...(req.body.organizacion.id) && { 'organizacion.id': req.body.organizacion.id },
        // tipoPrestacion
        ...(req.body.tipoPrestacion.conceptId) && { 'tipoPrestacion.conceptId': req.body.tipoPrestacion.conceptId }
    };

    try {
        const resultado: any = await ProfesionalMeta.findOne(query);
        if (typeof resultado === null || !resultado) {
            const frecuente = new ProfesionalMeta(req.body);
            await frecuente.save();
            return res.json(resultado);

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

            await resultado.save();
            return res.json(resultado);
        }
    } catch (err) {
        return next(err);
    }

});

export = router;
