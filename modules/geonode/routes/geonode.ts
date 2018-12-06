import * as express from 'express';
import { getServicioGeonode } from '../../../utils/servicioGeonode';

const router = express.Router();

router.get('/geonode', async (req, res, next) => {
    if (req.query.point) {
        const point = req.query.point;
        try {
            const resultado: any = await getServicioGeonode(point);
            res.json(resultado);
        } catch (err) {
            // return next(err);  No debería reflejarse el error en la app
            res.json(null);
        }
    } else {
        return next(500);
    }
});
export = router;
