import * as express from 'express';
import * as mongoose from 'mongoose';
import { AppCache } from '../../../connections';
import { ProfesionalMeta } from './../schemas/profesionalMeta';

const router = express.Router();


router.get('/frecuentesProfesional', async (req, res, next) => {
    if (!req.query.tipoPrestacion) {
        return next(404);
    }

    const idProfesional = req.query.idProfesional as any;
    const idOrganizacion = req.query.idOrganizacion as any;
    const tipoPrestacion = req.query.tipoPrestacion as any;

    const key = `frecuentes-${(idProfesional || '')}-${(idOrganizacion || '')}-${(tipoPrestacion || '')}`;
    const frecuentesCache = await AppCache.get(key);
    if (frecuentesCache) {
        return res.json(frecuentesCache);
    }


    const query = {};

    if (idProfesional) {
        query['profesional.id'] = mongoose.Types.ObjectId(idProfesional);
    }

    if (idOrganizacion) {
        query['organizacion.id'] = mongoose.Types.ObjectId(idOrganizacion);
    }

    if (tipoPrestacion) {
        query['tipoPrestacion.conceptId'] = tipoPrestacion;
    }

    const pipeline = [
        { $match: query },
        { $unwind: '$frecuentes' },
        {
            $project: {
                'frecuentes.concepto': 1,
                'frecuentes.frecuencia': 1,
                'frecuentes.esSolicitud': 1, _id: 0
            }
        },
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
        const frecuentes = await ProfesionalMeta.aggregate(pipeline);

        res.json(frecuentes);

        if (frecuentes.length >= 20) {
            AppCache.set(key, frecuentes, 60 * 60 * 2);
        }


    } catch (err) {
        return next(err);
    }

});

export = router;
