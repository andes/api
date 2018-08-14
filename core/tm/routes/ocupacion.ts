import * as express from 'express';
import { ocupacion } from '../schemas/ocupacion';


const router = express.Router();

router.get('/ocupacion', (req, res, next) => {

    ocupacion.find({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
