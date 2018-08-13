import * as mongoose from 'mongoose';
import * as express from 'express';

import * as internacionesController from './../controllers/internacion';
import * as camasController from './../controllers/cama';

let router = express.Router();

router.get('/internaciones/ultima/:idPaciente', (req, res, next) => {
    // buscamos la ultima interncion del paciente
    internacionesController.buscarUltimaInternacion(req.params.idPaciente, req.query.estado).then(
        internacion => {
            let salida = { ultimaInternacion: null, cama: null };
            if (internacion && internacion.length > 0) {
                let ultimaInternacion = internacion[0];
                // Ahora buscamos si se encuentra asociada la internacion a una cama
                camasController.buscarCamaInternacion(mongoose.Types.ObjectId(ultimaInternacion.id), 'ocupada').then(
                    camas => {
                        salida = { ultimaInternacion, cama: null };
                        if (camas && camas.length > 0) {
                            salida.cama = camas[0];
                        }
                        res.json(salida);
                    }).catch(err => {
                        return next(err);
                    });
            } else {
                res.json(null);
            }
        }).catch(error => {
            return next(error);
        });
});

router.get('/internaciones/pases/:idInternacion', (req, res, next) => {
    // buscamos los estados de la cama por donde "estuvo la internacion"
    camasController.buscarPasesCamaXInternacion(mongoose.Types.ObjectId(req.params.idInternacion)).then(
        camas => {
            if (camas) {
                res.json(camas);
            } else {
                res.json(null);
            }
        }).catch(err => {
            return next(err);
        });
});

export = router;
