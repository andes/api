import * as express from 'express';
import * as moment from 'moment';

import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

let router = express.Router();

/**
 * Obtiene las localidade disponible para la farmacia
 */

router.get('/farmacias/localidades', function (req: any, res, next) {

    farmaciasLocalidades.find({}).then(data => {
        return res.json(data);
    }).catch(err => {
        next(err);
    });
});


/**
 * Devuelte la farmacias de turno dado una localidad
 *
 * @param {number} localidad Id de la localidad
 */

router.get('/farmacias/turnos', function (req, res, next) {
    let localidad = req.query.localidad;
    let desde = moment(req.query.desde, 'YYYY-MM-DD').toDate();
    let hasta = moment(req.query.hasta, 'YYYY-MM-DD').toDate();
    let query: any = {
        fecha: { $gte: desde, $lte: hasta }
    };
    if (localidad) {
        query.localidad = localidad;
    }

    farmaciasTurnos.find(query).sort({ fecha: 1 }).then(data => {
        return res.json(data);
    }).catch(err => {
        next(err);
    });

});

export = router;
