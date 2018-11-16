
import * as express from 'express';
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

export = router;
