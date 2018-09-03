import * as express from 'express';
import * as procemiento from '../schemas/procedimientoQuirurgico';
const router = express.Router();


router.get('/procemientosQuirurgicos', (req, res, next) => {
    let query;
    query = procemiento.model.find({});

    query.exec({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
