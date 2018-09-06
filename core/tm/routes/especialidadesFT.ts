import * as express from 'express';
import * as especialidad from '../schemas/especialidadesFT';
import * as mongoose from 'mongoose';

const router = express.Router();

router.get('/especialidadFT/:id?', (req, res, next) => {

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {

        especialidad.findById(req.params.id, (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = especialidad.find({});

        query.sort({ descripcion: 1 });

        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

export = router;
