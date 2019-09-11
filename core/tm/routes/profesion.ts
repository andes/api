import * as express from 'express';
import { profesion } from '../schemas/profesion_model';

const router = express.Router();

router.get('/profesiones/:id*?', (req, res, next) => {

    if (req.params.id) {
        profesion.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });

    } else {

        profesion.find({}).sort({ codigoSISA: 1 }).exec((error, data) => {
            if (error) {
                return next(error);
            }

            res.json(data);
        });
    }
});

export = router;
