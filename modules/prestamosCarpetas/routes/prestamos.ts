import * as express from 'express';
import * as prestamosController from '../controller/prestamosController';

const router = express.Router();


router.get('/prestamosHC/solicitudes', async (req, res, next) => {
    try {
        const resultado = await prestamosController.getCarpetasSolicitud(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.get('/prestamosHC/prestamos', async (req, res, next) => {
    try {
        const resultado = await prestamosController.getCarpetasPrestamo(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/prestarCarpeta', async (req, res, next) => {
    try {
        const resultado = await prestamosController.prestarCarpeta(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/prestarCarpetas', async (req, res, next) => {
    try {
        const resultado = await prestamosController.prestarCarpetas(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});


// [TODO] Dejar una sola ruta de devolverCarpeta
router.post('/prestamosHC/devolverCarpeta', async (req, res, next) => {
    try {
        const resultado = await prestamosController.devolverCarpeta(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/devolverCarpetas', async (req, res, next) => {
    try {
        const resultado = await prestamosController.devolverCarpetas(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

// [TODO] Cambiar a GET
router.get('/prestamosHC/historial', async (req, res, next) => {
    try {
        const resultado = await prestamosController.getHistorial(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/manual', async (req, res, next) => {
    try {
        const resultado = await prestamosController.solicitudManualCarpeta(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

export = router;
