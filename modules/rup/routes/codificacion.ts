import * as express from 'express';
import { Types } from 'mongoose';
import { Codificacion } from '../schemas/codificacion';
import { Prestacion } from '../schemas/prestacion';
import { codificarPrestacion } from '../controllers/codificacionController';
import { Auth } from './../../../auth/auth.class';
import { IPrestacionDoc } from '../prestaciones.interface';
import { asyncHandler } from '@andes/api-tool';


const router = express.Router();

router.post('/codificacion', asyncHandler(async (req, res) => {
    const idPrestacion = req.body.idPrestacion;
    const prestacion = await Prestacion.findById(idPrestacion) as IPrestacionDoc;
    const codificaciones = await codificarPrestacion(prestacion);
    if (codificaciones) {
        const data = new Codificacion({
            idPrestacion,
            idProfesional: prestacion.solicitud.profesional.id,
            tipoPrestacion: prestacion.solicitud.tipoPrestacion,
            paciente: prestacion.paciente,
            ambitoPrestacion: prestacion.solicitud.ambitoOrigen,
            diagnostico: {
                codificaciones
            }
        });
        Auth.audit(data, req);
        await data.save();
        res.json(data);
    } else {
        res.json({});
    }
}));

router.patch('/codificacion/:id', async (req, res, next) => {
    const unaCodificacion = await Codificacion.findById(req.params.id);
    (unaCodificacion as any).diagnostico.codificaciones = req.body.codificaciones;
    const data = new Codificacion(unaCodificacion);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/codificacion/estadoFacturacion/:idPrestacion', async (req, res, next) => {
    try {
        const data = await Codificacion.findOneAndUpdate(
            { idPrestacion: Types.ObjectId(req.params.idPrestacion) },
            { $set: { estadoFacturacion: req.body.estadoFacturacion } }
        );

        await Prestacion.updateOne(
            { _id: Types.ObjectId(req.params.idPrestacion) },
            { $set: { estadoFacturacion: req.body.estadoFacturacion } }
        );

        res.json(data);
    } catch (err) {
        return next(err);
    }
});

router.get('/codificacion/:id?', async (req: any, res, next) => {
    if (Types.ObjectId.isValid(req.params.id)) {
        const unaCodificacion = await Codificacion.findById(req.params.id);
        res.json(unaCodificacion);
    } else {
        const filtros = {
            'createdBy.organizacion.id': req.user.organizacion.id,
            createdAt: {
                $gte: new Date(req.query.fechaDesde),
                $lte: new Date(req.query.fechaHasta)
            },
            ambitoPrestacion: 'ambulatorio'
        };

        if (!req.query.auditadas) {
            filtros['diagnostico.codificaciones.codificacionAuditoria.codigo'] = { $exists: req.query.auditadas };
        }
        const matchAdicional = {};
        if (req.query.idProfesional) {
            matchAdicional['prestacion.solicitud.profesional.id'] = { $eq: Types.ObjectId(req.query.idProfesional) };
        }

        if (req.query.idPrestacion) {
            matchAdicional['prestacion.solicitud.tipoPrestacion.id'] = Types.ObjectId(req.query.idPrestacion);
        }

        const pipeline = [
            {
                $match: filtros
            },
            {
                $project:
                {
                    id: '$_id',
                    diagnostico: 1,
                    idPrestacion: 1,
                    paciente: 1,
                    createdAt: 1,
                    createdBy: 1,
                    updatedAt: 1,
                    updatedBy: 1,
                    prestacion: '$tipoPrestacion.term'
                }
            },
            {
                $lookup: {
                    from: 'prestaciones',
                    localField: 'idPrestacion',
                    foreignField: '_id',
                    as: 'prestacion'
                }
            },
            {
                $unwind: '$prestacion'
            },
            {
                $match: matchAdicional
            },
            {
                $project: {
                    id: '$_id',
                    diagnostico: 1,
                    idPrestacion: 1,
                    paciente: 1,
                    profesional: '$prestacion.solicitud.profesional',
                    createdAt: 1,
                    createdBy: 1,
                    updatedAt: 1,
                    updatedBy: 1,
                    prestacion: '$tipoPrestacion.term'
                }
            }
        ];
        try {
            const data = await Codificacion.aggregate(pipeline);
            res.json(data);
        } catch (err) {
            return next(err);
        }
    }
});


export = router;
