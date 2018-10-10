import * as express from 'express';

import { Turno } from '../schemas/turno';


const router = express.Router();


router.get('/busqueda/:id*?', (req: any, res, next) => {
    const opciones = {};
    let query;
    if (req.params.id) {
        Turno.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {

        if (req.query.limit) {
            query = Turno.find(opciones).sort({ _id: -1 }).limit(Number(req.query.limit));
        } else {
            query = Turno.find(opciones);
        }


        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });

    }


});


router.post('/insert', (req: any, res, next) => {
    const newTurno = new Turno(req.body);
    newTurno.save((err) => {
        if (err) {
            return next(err);
        }
        res.json(newTurno);
    });
});

module.exports = router;
