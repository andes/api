import * as express from 'express';
import * as configuracionPrestacion from '../schemas/configuracionPrestaciones';

let router = express.Router();

router.get('/configuracionPrestaciones/:id*?', function (req, res, next) {
    // Agregar seguridad!!
    // if (!Auth.check(req, 'string')) {
    //     return next(403);
    // }

    if (req.params.id) {
        configuracionPrestacion.configuracionPrestacionModel.findById(req.params.id
        , function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        let query;
        query = configuracionPrestacion.configuracionPrestacionModel.find({});
        if (req.query.tipoPrestacion) {
            query.where('tipoPrestacion.conceptId').equals(req.query.tipoPrestacion);
        }
        if (req.query.organizacion) {
            query.where('organizacionesSips._id').equals(req.query.organizaciones);
        }
        query.exec(function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }
});

export = router;
