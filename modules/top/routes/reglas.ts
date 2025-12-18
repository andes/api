import { asyncHandler, Request } from '@andes/api-tool';
import { ResourceNotFound } from '@andes/core';
import * as express from 'express';
import * as mongoose from 'mongoose';
import { ConceptosTurneablesCtr } from '../../../core/tm/conceptos-turneables.routes';
import { ISnomedConcept } from '../../../modules/rup/schemas/snomed-concept';
import { ReglasTOP } from '../schemas/reglas';
import { Auth } from './../../../auth/auth.class';

const router = express.Router();

router.post('/reglas-v2', asyncHandler(async (req, res, next) => {
    const body = req.body;
    const regla = new ReglasTOP(body);
    Auth.audit(regla, req);
    await regla.save();
    return res.json(regla);
}));

router.patch('/reglas/:id', asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const regla = await ReglasTOP.findById(id);
    if (regla) {
        regla.set(req.body);
        Auth.audit(regla, req);
        await regla.save();
        return res.json(regla);
    }
    throw new ResourceNotFound();
}));

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
    const raw = req.query.raw || false;
    const esServicioIntermedio = req.query.esServicioIntermedio;

    if (req.query.organizacionOrigen as any) {
        query.where('origen.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionOrigen as any));
    }

    if (esServicioIntermedio !== undefined) {
        if (esServicioIntermedio) {
            query.where('destino.inicio').equals('servicio-intermedio');
        } else {
            query.where('destino.inicio', { $exist: false });
        }
    }

    if (req.query.prestacionOrigen as any) {
        query.or([
            { 'origen.prestaciones.prestacion.conceptId': req.query.prestacionOrigen as any },
            { 'origen.prestaciones': null },
        ]);
        // query.where('origen.prestaciones.prestacion.conceptId').equals(req.query.prestacionOrigen as any);
    } else if (req.query.prestacionesOrigen as any) {
        prestacionesPermisos = await ConceptosTurneablesCtr.getByPermisos(req, req.query.prestacionesOrigen as any);
        if (prestacionesPermisos) {
            query.where('origen.prestaciones.prestacion.conceptId').in(prestacionesPermisos.map(e => e.conceptId));
        }
    }

    if (req.query.organizacionDestino as any) {
        query.where('destino.organizacion.id').equals(new mongoose.Types.ObjectId(req.query.organizacionDestino as any));

    }
    if (req.query.search as any) {
        const searchRegex = new RegExp(req.query.search as any, 'i');
        query.where({
            $or: [
                { 'destino.organizacion.nombre': searchRegex },
                { 'destino.prestacion.term': searchRegex },
            ]
        });
    }
    if (req.query.prestacionDestino as any) {
        query.where('destino.prestacion.conceptId').equals(req.query.prestacionDestino as any);
    }

    if (req.query.skip as any) {
        query.skip(parseInt(req.query.skip as any || 0, 10));
    }

    if (req.query.limit as any) {
        query.limit(parseInt(req.query.limit as any || 0, 10));
    }

    const reglas = await query.sort({ 'destino.prestacion.term': 1 }).exec();
    if (prestacionesPermisos && !raw) {
        reglas.forEach(regla => {
            regla.origen.prestaciones = regla.origen.prestaciones.filter(p => prestacionesPermisos.find(pp => pp.conceptId === p.prestacion.conceptId));
        });
    }

    if (req.query.prestacionDestino as any && !raw) {
        reglas.forEach(regla => {
            if (Array.isArray(regla.destino.prestacion)) {
                regla.destino.prestacion = regla.destino.prestacion.find(p => (p.conceptId === req.query.prestacionDestino as any));
            }
        });
    }

    res.json(reglas);
});

router.delete('/reglas', async (req, res, next) => {
    try {
        const data = await ReglasTOP.deleteMany({
            'destino.organizacion.id': new mongoose.Types.ObjectId(req.query.organizacionDestino as any),
            'destino.prestacion.conceptId': req.query.prestacionDestino as any
        });
        return res.json(data);
    } catch (err) {
        return next(err);
    }
});

router.delete('/reglas/:id', async (req, res, next) => {
    try {
        const data = await ReglasTOP.deleteOne({ _id: new mongoose.Types.ObjectId(req.params.id) });
        return res.json(data);
    } catch (err) {
        return next(err);
    }
});

router.delete('/reglas/:id/prestaciones/:prestacionId', async (req, res, next) => {
    try {
        const { id, prestacionId } = req.params;
        const result = await ReglasTOP.updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $pull: { 'origen.prestaciones': { _id: new mongoose.Types.ObjectId(prestacionId) } } }
        );

        return res.json(result);
    } catch (err) {
        return next(err);
    }
});


export = router;
