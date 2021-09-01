import * as express from 'express';
import { ReglasTOP } from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';
import * as mongoose from 'mongoose';
import { ConceptosTurneablesCtr } from '../../../core/tm/conceptos-turneables.routes';
import { asyncHandler, Request } from '@andes/api-tool';
import { ISnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { ResourceNotFound } from '@andes/core';

const router = express.Router();

router.post('/reglas', async (req, res, next) => {
    const ArrReglas = req.body.reglas;
    try {
        if (ArrReglas.length > 0) {
            const params = {
                'destino.organizacion.id': ArrReglas[0].destino.organizacion.id,
                'destino.prestacion.conceptId': ArrReglas[0].destino.prestacion.conceptId,
            };
            await ReglasTOP.deleteMany(params);
        }
        const grabarReglas = ArrReglas.map(async (regla) => {
            const unaRegla = new ReglasTOP(regla);
            Auth.audit(unaRegla, req);
            return unaRegla.save();
        });
        await Promise.all(grabarReglas);
        res.json(ArrReglas);
    } catch (err) {
        return err;
    }
});

router.get('/reglas/:id', asyncHandler(async (req: Request, res) => {
    const id = req.params.id;
    const regla = await ReglasTOP.findById(id);
    if (regla) {
        return res.json(regla);
    }
    throw new ResourceNotFound();
}));

router.get('/reglas', async (req: Request, res, next) => {
    let prestacionesPermisos: ISnomedConcept[];
    const query = ReglasTOP.find({});
    if (req.query.organizacionOrigen) {
        query.where('origen.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionOrigen));
    }

    if (req.query.prestacionOrigen) {
        query.or([
            { 'origen.prestaciones.prestacion.conceptId': req.query.prestacionOrigen },
            { 'origen.prestaciones': null },
        ]);
        // query.where('origen.prestaciones.prestacion.conceptId').equals(req.query.prestacionOrigen);
    } else if (req.query.prestacionesOrigen) {
        prestacionesPermisos = await ConceptosTurneablesCtr.getByPermisos(req, req.query.prestacionesOrigen);
        if (prestacionesPermisos) {
            query.where('origen.prestaciones.prestacion.conceptId').in(prestacionesPermisos.map(e => e.conceptId));
        }
    }

    if (req.query.organizacionDestino) {
        query.where('destino.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionDestino));
    }
    if (req.query.prestacionDestino) {
        query.where('destino.prestacion.conceptId').equals(req.query.prestacionDestino);
    }
    const reglas = await query.exec();
    if (prestacionesPermisos) {
        reglas.forEach(regla => {
            regla.origen.prestaciones = regla.origen.prestaciones.filter(p => prestacionesPermisos.find(pp => pp.conceptId === p.prestacion.conceptId));
        });
    }

    if (req.query.prestacionDestino) {
        reglas.forEach(regla => {
            if (Array.isArray(regla.destino.prestacion)) {
                regla.destino.prestacion = regla.destino.prestacion.find(p => p.conceptId === req.query.prestacionDestino);
            }
        });
    }

    res.json(reglas);
});

router.delete('/reglas', async (req, res, next) => {
    ReglasTOP.deleteMany({
        'destino.organizacion.id': new mongoose.Types.ObjectId(req.query.organizacionDestino),
        'destino.prestacion.conceptId': req.query.prestacionDestino
    }).exec((err, data) => {
        res.json(data);
    });
});

export = router;
