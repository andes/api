import * as express from 'express';
import { laboratorioLog } from '../laboratorio.log';
import * as laboratorioController from '../laboratorios.controller';

const router = express.Router();

router.get('/protocolosLab', async (req: any, res, next) => {
    if (!req.query.pacienteId) {
        return next('Faltan parámetros requeridos');
    }
    const response = await laboratorioController.searchByDocumento(req.query.pacienteId, req.query.fechaDesde, req.query.fechaHasta);
    if (response.err) {
        const errorMessage = response.err.message || 'Error desconocido';
        await laboratorioLog.error('busqueda-idPaciente', response.dataSearch, response.err, req);
        return res.status(500).json(errorMessage);
    } else {
        if (req.user?.type === 'paciente-token') {
            response[0].Data = response[0].Data.filter(protocolo => protocolo.estado !== 'EnProceso');
        }
        return res.json(response);
    }
});

router.get('/protocolosLab/:id?', async (req, res, next) => {
    if (!req.params.id) {
        return next('Faltan parámetros requeridos');
    }
    try {
        const response = await laboratorioController.search({ idProtocolo: req.params.id });
        return res.json(response);
    } catch (e) {
        const errorMessage = e.message || 'Error desconocido';
        await laboratorioLog.error('busqueda-idProtocolo', { idProtocolo: req.params.id }, errorMessage, req);
        return res.status(500).json('Error al obtener protocolo de laboratorio: ' + errorMessage);
    };
});

export = router;
