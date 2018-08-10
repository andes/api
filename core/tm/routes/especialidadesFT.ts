import * as express from 'express';
import * as especialidad from '../schemas/especialidadesFT';
import * as mongoose from 'mongoose';
import * as moment from 'moment';

let router = express.Router();

router.get('/especialidadFT/:id?', function (req, res, next) {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        especialidad.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = especialidad.find({});

        query.sort({ descripcion: 1 });

        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

export = router;
