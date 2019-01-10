
import * as express from 'express';
import * as mongoose from 'mongoose';
import { codificacion } from '../schemas/codificacion';
import * as prestacion from '../schemas/prestacion';
import * as codificacionController from '../controllers/codificacionController';
import { Auth } from './../../../auth/auth.class';


const router = express.Router();

router.post('/codificacion', async (req, res, next) => {
    const idPrestacion = req.body.idPrestacion;
    const unaPrestacion = await prestacion.model.findById(idPrestacion);
    const codificaciones = await codificacionController.codificarPrestacion(unaPrestacion);
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


router.get('/codificacion/:id?', async (req: any, res, next) => {
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        const unaCodificacion = await codificacion.findById(req.params.id);
        res.json(unaCodificacion);
    } else {
        let query;
        query = codificacion.find({});
        if (req.user.organizacion && req.user.organizacion.id) {
            query.where('createdBy.organizacion._id').equals(req.user.organizacion.id);
        }
        if (req.query.fechaDesde) {
            query.where('createdAt').gte(req.query.fechaDesde);
        }
        if (req.query.fechaHasta) {
            query.where('createdAt').lte(req.query.fechaHasta);
        }
        if (req.query.auditadas === false) {
            query.where('diagnostico.codificaciones.codificacionAuditoria.codigo').exists(false);
        }

        query.exec(async (err, data: any) => {
            if (err) {
                return next(err);
            }
            const cantidad = data.length;
            if (cantidad > 0) {
                for (let i = 0; i < cantidad; i++) {
                    let objeto = { ...data[i] }._doc;
                    let unaPrestacion = await prestacion.model.findById(data[i].idPrestacion);
                    objeto.prestacion = (unaPrestacion as any).solicitud.tipoPrestacion ? (unaPrestacion as any).solicitud.tipoPrestacion.term : null;
                    data[i] = objeto;
                }
            }
            res.json(data);
        });
    }
});


export = router;
