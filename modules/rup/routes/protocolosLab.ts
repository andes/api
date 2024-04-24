import * as express from 'express';
import { services } from '../../../services';
import { Logger } from '../../../utils/logService';

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
    } catch (e) {
        await Logger.log(req, req.params.module, req.params.op, req.body.data);
        res.json('error:' + e.message);
    }
});

export = router;
