import * as express from 'express';
import * as reglas from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import * as reglasCtrl from '../controller/reglas';
import { tipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';

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
    let query = reglas.find({});
    if (req.query.organizacionOrigen) {
        query.where('origen.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionOrigen));
    }

    if (req.query.prestacionOrigen) {
        query.where('origen.prestaciones.prestacion.conceptId').equals(req.query.prestacionOrigen);
    } else if (req.query.prestacionesOrigen) {
        let prestacionesPermisos = Auth.getPermissions(req, req.query.prestacionesOrigen);
        if (prestacionesPermisos.length && prestacionesPermisos[0] !== '*') {
            const conceptos = await tipoPrestacion.find({}).where('_id').in(prestacionesPermisos.map(x => mongoose.Types.ObjectId(x))).exec();
            query.where('origen.prestaciones.prestacion.conceptId').in(conceptos.map(e => e.conceptId));
        }
    }

    if (req.query.organizacionDestino) {
        query.where('destino.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionDestino));
    }
    if (req.query.prestacionDestino) {
        query.where('destino.prestacion.conceptId').equals(req.query.prestacionDestino);
    }
    query.exec((err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
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
