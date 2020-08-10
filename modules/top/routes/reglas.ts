import * as express from 'express';
import * as reglas from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { toArray } from '../../../utils/utils';

const router = express.Router();

router.post('/reglas', async (req, res, next) => {
    const ArrReglas = req.body.reglas;
    try {
        if (ArrReglas.length > 0) {
            const params = {
                'destino.organizacion.id': ArrReglas[0].destino.organizacion.id,
                'destino.prestacion.conceptId': ArrReglas[0].destino.prestacion.conceptId,
            };
            await reglas.deleteMany(params);
        }
        let grabarReglas = ArrReglas.map(async (regla) => {
            let unaRegla = new reglas(regla);
            Auth.audit(unaRegla, req);
            return unaRegla.save();
        });
        await Promise.all(grabarReglas);
        res.json(ArrReglas);
    } catch (err) {
        return err;
    }
});

router.get('/reglas', async (req, res, next) => {
    let $match = {};
    let pipeline = [];
    pipeline.push({ $match });

    if (req.query.organizacionOrigen) {
        $match['origen.organizacion.id'] = { $eq: (new mongoose.Types.ObjectId(req.query.organizacionOrigen)) };
    }

    if (req.query.prestacionOrigen) {
        $match['origen.prestaciones.prestacion.conceptId'] = { $eq: req.query.prestacionOrigen };
    } else if (req.query.prestacionesOrigen) {
        let prestacionesPermisos = Auth.getPermissions(req, req.query.prestacionesOrigen);
        if (prestacionesPermisos.length && prestacionesPermisos[0] !== '*') {
            const conceptos = await tipoPrestacion.find({}).where('_id').in(prestacionesPermisos.map(x => mongoose.Types.ObjectId(x))).exec();
            $match['origen.prestaciones.prestacion.conceptId'] = { $in: conceptos.map(e => e.conceptId) };

            if (req.query.soloOrigen) {
                pipeline.push({ $addFields: { prestacionesOrigen: '$origen.prestaciones' } });
                pipeline.push({ $unwind: '$prestacionesOrigen' });
                pipeline.push({ $match: { 'prestacionesOrigen.prestacion.conceptId': { $in: conceptos.map(e => e.conceptId) } } });
                pipeline.push({
                    $group: {
                        _id: '$_id',
                        origen: { $first: '$origen' },
                        destino: { $first: '$destino' },
                        prestacionesOrigen: { $push: '$prestacionesOrigen' }
                    }
                });
                pipeline.push({
                    $project: {
                        _id: '$_id',
                        origen: {
                            organizacion: '$origen.organizacion',
                            prestaciones: '$prestacionesOrigen'

                        },
                        destino: '$destino'
                    }
                });
            }
        }
    }

    if (req.query.organizacionDestino) {
        $match['destino.organizacion.id'] = { $eq: new mongoose.Types.ObjectId(req.query.organizacionDestino) };
    }
    if (req.query.prestacionDestino) {
        $match['destino.prestacion.conceptId'] = { $eq: new mongoose.Types.ObjectId(req.query.prestacionDestino) };
    }
    res.json(await toArray(reglas.aggregate(pipeline).cursor({}).exec()));
});

router.delete('/reglas', async (req, res, next) => {
    reglas.deleteMany({
        'destino.organizacion.id': new mongoose.Types.ObjectId(req.query.organizacionDestino),
        'destino.prestacion.conceptId': req.query.prestacionDestino
    }).exec((err, data) => {
        res.json(data);
    });
});

export = router;
