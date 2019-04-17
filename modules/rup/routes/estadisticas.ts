import * as express from 'express';
import * as moment from 'moment';
import { dashboard, estadisticaDemografica } from '../controllers/estadisticas';
import { Auth } from '../../../auth/auth.class';

const router = express.Router();

router.get('/estadisticas', async (req, res) => {
    const org = Auth.getOrganization(req);
    const desde = moment(req.query.desde).toDate();
    const hasta = moment(req.query.hasta).toDate();
    let prestaciones = req.query.prestaciones;
    prestaciones = Array.isArray(prestaciones) ? prestaciones : [prestaciones];

    const resultados = await dashboard(org, prestaciones, desde, hasta);
    res.json(resultados);
});

router.get('/estadisticas/demografia', async (req, res) => {
    const org = Auth.getOrganization(req);
    let prestaciones = req.query.ids;
    prestaciones = Array.isArray(prestaciones) ? prestaciones : [prestaciones];

    const resultados = await estadisticaDemografica(prestaciones);
    res.json(resultados);
});

export = router;
