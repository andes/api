
import * as express from 'express';
import { codificacion } from '../schemas/codificacion';
import * as prestacion from '../schemas/prestacion';
import * as codificacionController from '../controllers/codificacionController';
import * as mongoose from 'mongoose';
import { Auth } from './../../../auth/auth.class';


const router = express.Router();

router.post('/codificacion', async (req, res, next) => {
    const idPrestacion = req.body.idPrestacion;
    const unaPrestacion = await prestacion.model.findById(idPrestacion);
    const codificaciones = await codificacionController.codificarPrestacion(unaPrestacion);
    const data = new codificacion({
        idPrestacion,
        diagnostico: {
            codificaciones
        }
    });
    console.log('data ', data);
    Auth.audit(data, req);
    data.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
