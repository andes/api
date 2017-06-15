import * as express from 'express';
import * as tipoEstablecimiento from '../schemas/tipoEstablecimiento_model';

let router = express.Router();

router.get('/tiposEstablecimiento/:id*?', function (req, res, next) {
    if (req.params.id) {
        tipoEstablecimiento.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        tipoEstablecimiento.find({}, (err, data) => {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    }
});
export = router;








