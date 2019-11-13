import * as express from 'express';

import * as WebHookLogController from '../controller/webhookLogController';
import * as config from '../../../config';

let router = express.Router();

/**
 * Get /webhooklogs/:id
 *
 * Devuelve los detalles del webhook asociados al id
 */
router.get('/webhooklogs/:id', async (req: any, res, next) => {
    const id = req.params.id;
    if (!id) {
        return next({ message: 'No se recibieron parámetros' });
    } else {
        try {
            let data = await WebHookLogController.getById(id);
            return res.json(data);
        } catch (err) {
            return next(err);
        }
    }
});

/**
 * Get /webhooklogs
 *
 * Devuelve los webhooklogs que contengan 'cadena' en la URL o en event
 */
router.get('/webhooklogs', async (req: any, res, next) => {
    if (req.query) {
        let cadena = req.query.search;
        const fechaIni = req.query.fechaInicio;
        const fechaFin = req.query.fechaFin;
        // Paginado
        let skip = parseInt(req.query.skip || 0, 10);
        let limit = Math.min(parseInt(req.query.limit || config.defaultLimit, 10), config.maxLimit);
        try {
            let data = await WebHookLogController.getAll(cadena, fechaIni, fechaFin, skip, limit);
            return res.json(data);
        } catch (err) {
            return next(err);
        }

    }
});

export = router;
