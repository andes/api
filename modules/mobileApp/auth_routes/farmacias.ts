import * as express from 'express';
import * as moment from 'moment';

import { farmaciasLocalidades, farmaciasTurnos } from '../schemas/farmacias';

const router = express.Router();

/**
 * Obtiene las localidade disponible para la farmacia
 */

router.get('/farmacias/localidades', (req: any, res, next) => {
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

router.get('/farmacias/turnos', (req, res, next) => {
    const localidad = req.query.localidad;
    const desde = moment(req.query.desde, 'YYYY-MM-DD').toDate();
    const hasta = moment(req.query.hasta, 'YYYY-MM-DD').toDate();
    const query: any = {
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
