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
    create(req.body).then( newCamaEstado => {
        res.json(newCamaEstado);
    }).catch(err => {
        return next(err);
    });
});

function create(estado) {
    let newCamaEstado = new camaEstado(estado);

    return new Promise((resolve, reject) => {
        newCamaEstado.save((err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        });
    });
}
export = router;
