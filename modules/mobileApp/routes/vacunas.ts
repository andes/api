import { vacunas } from '../schemas/vacunas';
import * as mongoose from 'mongoose';
import * as express from 'express';

let router = express.Router();

router.get('/vacunas', function (req: any, res, next) {
    let dni = req.params.dni;
console.log("Entraaa Vacunas");
    vacunas.findById({ 'dni': dni }, function (err, data) {
        if (err) {
            next(err);
        };

        res.json(data);
    });

});