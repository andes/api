import * as express from 'express';
import { ocupacion } from '../schemas/ocupacion';


let router = express.Router();

router.get('/ocupacion', function (req, res, next) {

    ocupacion.find({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
