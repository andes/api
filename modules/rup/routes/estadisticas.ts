import * as express from 'express';
import * as moment from 'moment';
import { dashboard } from '../controllers/estadisticas';
import { Auth } from '../../../auth/auth.class';

let router = express.Router();

router.get('/estadisticas', async (req, res) => {
    let org = Auth.getOrganization(req);
    let desde = moment(req.query.desde).toDate();
    let hasta = moment(req.query.hasta).toDate();
    let prestaciones = req.query.prestaciones;
    prestaciones = Array.isArray(prestaciones) ? prestaciones : [prestaciones];

    let resultados = await dashboard(org, prestaciones, desde, hasta);
    res.json(resultados);
});

export = router;
