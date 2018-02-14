import * as express from 'express';
import {camaEstado} from '../schemas/camaEstado';
import * as CamaEstadoModel from '../models/camaEstado';

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
    CamaEstadoModel.crear(req.body.estado.ultimoEstado, req).then( newCamaEstado => {
        res.json(newCamaEstado);
    }).catch(err => {
        return next(err);
    });
});


export = router;
