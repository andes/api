import * as express from 'express';
import * as moment from 'moment';

import { FarmaciasLocalidades, FarmaciasTurnos } from '../schemas/farmacias';

const router = express.Router();

/**
 * Obtiene las localidade disponible para la farmacia
 */

router.get('/farmacias/localidades', async (req, res, next) => {
    try {
        const localidades = await FarmaciasLocalidades.find({});
        return res.json(localidades);
    } catch (err) {
        return next(err);
    }
});


/**
 * Devuelte la farmacias de turno dado una localidad
 *
 * @param {number} localidad Id de la localidad
 */

router.get('/farmacias/turnos', async (req, res, next) => {
    try {
        const localidad = req.query.localidad;
        const desde = moment(req.query.desde, 'YYYY-MM-DD').toDate();
        const hasta = moment(req.query.hasta, 'YYYY-MM-DD').toDate();
        const query: any = {
            fecha: {
                $gte: desde,
                $lte: hasta
            }
        };
        if (localidad) {
            query.localidad = localidad;
        }

        let farmacias = await FarmaciasTurnos.find(query).sort({ fecha: 1 });
        return res.json(farmacias);
    } catch (err) {
        return next(err);
    }

});

export = router;
