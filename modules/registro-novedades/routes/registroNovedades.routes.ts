import * as express from 'express';

import * as RegistroNovedadesController from '../controller/registroNovedadesController';
import * as config from '../../../config';

let router = express.Router();

/**
 * Get /registro-novedades/:id
 *
 * Devuelve los detalles del registroNovedades asociados al id
 */
router.get('/novedades/:id', async (req: any, res, next) => {
    const id = req.params.id;
    if (!id) {
        return next({ message: 'No se recibieron parámetros' });
    } else {
        try {
            let data = await RegistroNovedadesController.getById(id);
            return res.json(data);
        } catch (err) {
            return next(err);
        }
    }
});

/**
 * Get /registro-novedades/novedades
 *
 * Devuelve los registros de novedades que contengan 'cadena' o o fecha esté entre fechaInicio y fechaFin
 */
router.get('/novedades', async (req: any, res, next) => {
    if (req.query) {
        let cadena = req.query.search;
        const fechaInicio = req.query.fechaInicio;
        const fechaFin = req.query.fechaFin;
        // Paginado

        let skip = parseInt(req.query.skip || 0, 10);
        let limit = Math.min(parseInt(req.query.limit || config.defaultLimit, 10), config.maxLimit);
        try {
            let data = await RegistroNovedadesController.getAllNovedades(cadena, fechaInicio, fechaFin, skip, limit);
            return res.json(data);
        } catch (err) {
            return next(err);
        }

    }
});

/**
 * * Get /registro-novedades/modulo_andes
 */
// Get para obtener todos los MÓDULOS de ANDES (moduloAndes)
router.get('/modulo_andes', async (req: any, res, next) => {
    try {
        let data = await RegistroNovedadesController.getAllModulosAndes();
        return res.json(data);
    } catch (err) {
        return next(err);
    }
});

// PATCH para actualizar un recurso del servidor
router.patch('/novedades/:id', async (req, res, next) => {
    let resPatch: any;
    const id = req.params.id;
    try {
        let newNov = req.body;
        if (newNov) {
            resPatch = await RegistroNovedadesController.patchNovedad(id, newNov);
            return res.json(resPatch);
        }
    } catch (err) {
        return next(err);
    }
});


/**
 * POST /registro-novedades/novedades
 *
 * Devuelve los registros de novedades que contengan 'cadena' o o fecha esté entre fechaInicio y fechaFin
 */
// POST para crear un recurso del servidor
router.post('/novedades/', (req, res, next) => {
    let resPost;
    try {
        let newNov = req.body.newregNov;
        if (newNov) {
            resPost = RegistroNovedadesController.postNovedad(newNov);
            return res.json(resPost);
        }
    } catch (err) {
        return next(err);
    }
});


export = router;
