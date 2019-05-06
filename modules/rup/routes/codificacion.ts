import * as express from 'express';
import { Types } from 'mongoose';
import * as codificacion from '../schemas/codificacion';
import { model as modelPrestacion } from '../schemas/prestacion';
import { codificarPrestacion } from '../controllers/codificacionController';
import { Auth } from './../../../auth/auth.class';
import { toArray } from '../../../utils/utils';


const router = express.Router();

router.post('/codificacion', async (req, res, next) => {
    const idPrestacion = req.body.idPrestacion;
    const unaPrestacion = await modelPrestacion.findById(idPrestacion);
    const codificaciones = await codificarPrestacion(unaPrestacion);
    let data = new codificacion({
        idPrestacion,
        paciente: (unaPrestacion as any).paciente,
        diagnostico: {
            codificaciones
        }
    });

    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

router.patch('/codificacion/:id', async (req, res, next) => {
    const unaCodificacion = await codificacion.findById(req.params.id);
    (unaCodificacion as any).diagnostico.codificaciones = req.body.codificaciones;
    let data = new codificacion(unaCodificacion);
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
        const data = await codificacion.findOneAndUpdate(
            { idPrestacion: Types.ObjectId(req.params.idPrestacion) },
            { $set: { estadoFacturacion: req.body.estadoFacturacion } });

        res.json(data);
    } catch (err) {
        return next(err);
    }
});

router.get('/codificacion/:id?', async (req: any, res, next) => {
    if (Types.ObjectId.isValid(req.params.id)) {
        const unaCodificacion = await codificacion.findById(req.params.id);
        res.json(unaCodificacion);
    } else {
        let filtros = {
            'createdBy.organizacion.id': req.user.organizacion.id,
            createdAt: {
                $gte: new Date(req.query.fechaDesde),
                $lte: new Date(req.query.fechaHasta),
            },
        };

        if (!req.query.auditadas) {
            filtros['diagnostico.codificaciones.codificacionAuditoria.codigo'] = { $exists: req.query.auditadas };
        }

        let pipeline = [
            {
                $match: filtros
            },
            {
                $lookup: {
                    from: 'prestaciones',
                    localField: 'idPrestacion',
                    foreignField: '_id',
                    as: 'prestacion'
                }
            },
            { $unwind: '$prestacion' },
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
                    prestacion: '$prestacion.solicitud.tipoPrestacion.term'
                }
            }];
        try {
            const data = await toArray(codificacion.aggregate(pipeline).cursor({}).exec());
            res.json(data);
        } catch (err) {
            return next(err);
        }
    }
});


export = router;
