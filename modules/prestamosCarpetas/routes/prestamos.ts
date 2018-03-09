import * as express from 'express';
import * as debug from 'debug';
import * as prestamosController from '../controller/prestamosController';
import { ObjectId } from 'bson';

let router = express.Router();
let dbg = debug('prestamo');

router.post('/prestamosHC/', async function(req, res, next) {
    try {
        let resultado = await prestamosController.getCarpetas(req);
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

export = router;
