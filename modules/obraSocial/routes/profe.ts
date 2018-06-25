import * as mongoose from 'mongoose';
import * as express from 'express';
import { profe } from '../schemas/profe';

let router = express.Router();

router.get('/profe/', function (req, res, next) {
    if (req.query.dni) {
        profe.find({ dni: Number.parseInt(req.query.dni) }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

module.exports = router;
