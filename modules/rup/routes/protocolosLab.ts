import * as express from 'express';
import { services } from '../../../services';
import { laboratorioLog } from '../laboratorio.log';

const router = express.Router();

router.get('/protocolosLab/:id?', async (req, res, next) => {
    let params;
    const service = 'get-LABAPI';
    if (req.params.id) {
        params = {
            parametros: `nombre=LABAPI_GetResultadoProtocolo&parametros=${req.params.id}`
        };
    } else {
        params = {
            parametros: `nombre=LABAPI_GetProtocolos&parametros=${req.query.estado}|${req.query.dni}|${req.query.fecNac}|${req.query.apellido}|${req.query.fechaDde}|${req.query.fechaHta}`
        };
    }
    try {
        const response = await services.get(service).exec(params);
        if (!response.length) {
            throw new Error(response || service);
        }
        res.json(response);
    } catch (err) {
        const data = {
            id: req.params.id,
            estado: req.query.estado,
            documento: req.query.dni,
            fechaNacimiento: req.query.fecNac,
            apellido: req.query.apellido,
            fechaDesde: req.query.fechaDde,
            fechaHasta: req.query.fechaHta
        };
        await laboratorioLog.error('resultado-protocolo', data, err, req);
        res.json('error:' + err.message);
    }
});

export = router;
