import * as express from 'express';
import * as configuracionPrestacion from '../schemas/configuracionPrestaciones';

let router = express.Router();

router.get('/:id*', function (req, res, next) {
    // Agregar seguridad!!
    // if (!Auth.check(req, 'string')) {
    //     return next(403);
    // }

    if (req.params.id) {
        let identificador = req.params.id;
        configuracionPrestacion.configuracionPrestacionModel.findById({id: identificador}, function (err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    } else {
        configuracionPrestacion.configuracionPrestacionModel.find({}, function(err, result) {
            if (err) {
                return next(err);
            }
            res.json(result);
        });
    }
});


export = router;
