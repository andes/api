import * as express from 'express';
import { laboratorioLog } from '../laboratorio.log';
import * as laboratorioController from '../laboratorios.controller';

const router = express.Router();

router.get('/protocolosLab/:id?', async (req, res, next) => {
    let dataSearch = {};
    const service = 'get-LABAPI';
    if (req.params.id) {
        dataSearch = { idProtocolo: req.params.id };
    } else {
        dataSearch = {
            estado: req.query.estado,
            dni: req.query.dni,
            fechaNac: req.query.fecNac,
            apellido: req.query.apellido,
            fechaDesde: req.query.fechaDde,
            fechaHasta: req.query.fechaHta
        };
    }
    try {
        const response = await laboratorioController.search(dataSearch);
        if (!response.length) {
            throw new Error(response || service);
        }
        res.json(response);
    } catch (err) {
        dataSearch['id'] = req.params.id;
        await laboratorioLog.error('resultado-protocolo', dataSearch, err, req);
        res.json('error:' + err.message);
    }
});

export = router;
