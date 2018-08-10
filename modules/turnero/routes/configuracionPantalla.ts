import * as express from 'express';

import { configuracionPantalla } from '../schemas/configuracionPantalla';


let router = express.Router();


router.get('/busquedaConfiguracion/:id*?', function (req: any, res, next) {
    let opciones = {};
    let query;
    if (req.params.id) {
        configuracionPantalla.findById(req.params.id, function (err, data) {
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


        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });

    }


});


router.post('/insertConfiguracion', function (req: any, res, next) {

    if (req.body.id) {
        configuracionPantalla.findByIdAndUpdate(req.body._id, req.body, { new: true }, function (err, data) {
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
            }, function (err1, file) {
                if (file.length > 0) {
                    res.send(null);
                } else {
                    let newTurno = new configuracionPantalla(req.body);
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
