import * as express from 'express';
import {camaEstado} from '../schemas/camaEstado';

let router = express.Router();

router.get('/camas/:id/estados', function (req, res, next) {

    camaEstado.find({}, (err, data) => {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});


router.post('/camas', function (req, res, next) {
    let newCamaEstado = new camaEstado(req.body);
    newCamaEstado.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newCamaEstado);
    });
});

export = router;
