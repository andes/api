import * as express from 'express';
import * as tipoEstablecimiento from '../schemas/tipoEstablecimiento_model';

const router = express.Router();

router.get('/tiposEstablecimiento/:id*?', (req, res, next) => {
    if (req.params.id) {
        tipoEstablecimiento.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        tipoEstablecimiento.find({}, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});
export = router;

