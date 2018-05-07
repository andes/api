import * as mongoose from 'mongoose';
import * as express from 'express';
import { puco } from '../schemas/puco';

let router = express.Router();

router.get('/puco', function (req, res, next) {
    if (req.query.dni) {
        { tags: { $in: ["laborum", "sunt", "nisi"] } }
        puco.find({ dni: Number.parseInt(req.query.dni) }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

module.exports = router;
