import { vacunas } from '../schemas/vacunas';
import * as mongoose from 'mongoose';
import * as express from 'express';

let router = express.Router();

router.get('/vacunas', function (req: any, res, next) {
    let dni = req.query.dni;

    const sort = {FechaAplicacion: -1};

    vacunas.find({ 'dni': dni }).sort(sort).exec( (err, data)  => {
        if (err) {
            return next(err);
        }

        res.json(data);
    });

});

module.exports = router;
