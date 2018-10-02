import * as express from 'express';
import * as configuracionPrestacion from '../schemas/configuracionPrestacion';

let router = express.Router();

router.get('/configuracionPrestaciones/:id*?', (req, res, next) => {
    // Agregar seguridad!!
    // if (!Auth.check(req, 'string')) {
    //     return next(403);
    // }

    if (req.params.id) {
        configuracionPrestacion.configuracionPrestacionModel.findById(req.params.id
        , (err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = configuracionPrestacion.configuracionPrestacionModel.find({});
        if (req.query.snomed) {
            query.where('snomed.conceptId').equals(req.query.snomed);
        }
        if (req.query.organizacion) {
            query.where('organizaciones._id').equals(req.query.organizaciones);
        }
        query.exec((err, data) => {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

export = router;
