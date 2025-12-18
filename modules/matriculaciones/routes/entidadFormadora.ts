import * as express from 'express';
import * as entidadFormadora from '../schemas/entidadFormadora';

const router = express.Router();

router.get('/entidadesFormadoras/:id*?', (req, res, next) => {

    if ((req.params as any).id) {
        entidadFormadora.findById((req.params as any).id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });

    } else {

        entidadFormadora.find({ habilitado: true }).sort({ codigoSISA: 1 }).exec((error, data) => {
            if (error) {
                return next(error);
            }

            res.json(data);
        });
    }

});


export = router;
