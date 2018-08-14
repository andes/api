import * as express from 'express';

import { configuracionPantalla } from '../schemas/configuracionPantalla';


const router = express.Router();


router.get('/busquedaConfiguracion/:id*?', (req: any, res, next) => {
    const opciones = {};
    let query;
    if (req.params.id) {
        configuracionPantalla.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        if (req.query.nombrePantalla) {
            opciones['nombrePantalla'] = req.query.nombrePantalla;
        }
        query = configuracionPantalla.find(opciones);


        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });

    }


});


router.post('/insertConfiguracion', (req: any, res, next) => {

    if (req.body.id) {
        configuracionPantalla.findByIdAndUpdate(req.body._id, req.body, { new: true }, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(req.body);
        });
    } else {
        configuracionPantalla.find({
            nombrePantalla: req.body.nombrePantalla
        }, {}, {
            sort: {
                _id: -1
            }
        }, (err1, file) => {
            if (file.length > 0) {
                res.send(null);
            } else {
                const newTurno = new configuracionPantalla(req.body);
                newTurno.save((err2) => {
                    if (err2) {
                        return next(err2);
                    }
                    res.json(newTurno);
                });
            }
        });


    }


});

module.exports = router;
