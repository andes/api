import * as express from 'express';

import { turno } from '../schemas/turno';


let router = express.Router();



router.get('/busqueda/:id*?', function (req: any, res, next) {
    let opciones = {};
    let query;
    if (req.params.id) {
        turno.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {

        if (req.query.limit) {
            query = turno.find(opciones).sort({ _id: -1 }).limit(Number(req.query.limit));
        } else {
            query = turno.find(opciones);

        }



        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });

    }


});



router.post('/insert', function (req: any, res, next) {
    let newTurno = new turno(req.body);
    newTurno.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newTurno);
    });
});

module.exports = router;
