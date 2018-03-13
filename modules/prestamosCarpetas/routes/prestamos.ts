import * as express from 'express';
import * as debug from 'debug';
import * as prestamosController from '../controller/prestamosController';
import { ObjectId } from 'bson';

let router = express.Router();
let dbg = debug('prestamo');

router.post('/prestamosHC/getCarpetasSolicitud', async function(req, res, next) {
    try {
        let resultado = await prestamosController.getCarpetasSolicitud(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/getCarpetasPrestamo', async function(req, res, next) {
    try {
        let resultado = await prestamosController.getCarpetasPrestamo(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/prestarCarpeta', async function(req, res, next) {
    try {
        let resultado = await prestamosController.prestarCarpeta(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/devolverCarpeta', async function(req, res, next) {
    try {
        let resultado = await prestamosController.devolverCarpeta(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

router.post('/prestamosHC/historial', async function(req, res, next) {
    try {
        let resultado = await prestamosController.getHistorial(req);
        res.json(resultado);
    } catch (err) {
        return next(err);
    }
});

export = router;
