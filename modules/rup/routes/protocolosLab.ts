import * as express from 'express';
import { laboratorioLog } from '../laboratorio.log';
import * as laboratorioController from '../laboratorios.controller';

const router = express.Router();

router.get('/protocolosLab/:id?', async (req, res, next) => {
    try {
        const response = await laboratorioController.search({ idProtocolo: req.params.id });
        if (response) {
            return res.json(response);
        }
        return next(404);
    } catch (err) {
        await laboratorioLog.error('busqueda-idProtocolo', { idProtocolo: req.params.id }, err, req);
        res.json(err);
    }
});

router.get('/protocolosLab', async (req, res, next) => {
    if (!req.params.pacienteId) {
        throw new Error('Faltan parámetros requeridos');
    }
    const response = await laboratorioController.searchByDocumento(req.query.pacienteId, req.query.fechaDesde, req.query.fechaHasta);
    if (response.err) {
        await laboratorioLog.error('busqueda-idPaciente', response.dataSearch, response.err, req);
        return next(response.err);
    } else {
        return res.json(response);
    }
});

export = router;
