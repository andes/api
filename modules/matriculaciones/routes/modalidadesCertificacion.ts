import * as express from 'express';
import * as modalidadesCertificacion from '../schemas/modalidadesCertificacion';

const router = express.Router();

router.get('/modalidadesCertificacion/:id*?', (req, res, next) => {

    if ((req.params as any).id) {
        modalidadesCertificacion.findById((req.params as any).id, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });

    } else {

        modalidadesCertificacion.find().exec((error, data) => {
            if (error) {
                return next(error);
            }

            res.json(data);
        });
    }

});


export = router;
