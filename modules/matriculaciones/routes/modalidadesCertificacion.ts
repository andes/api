import * as express from 'express';
import * as modalidadesCertificacion from '../schemas/modalidadesCertificacion';

let router = express.Router();

router.get('/modalidadesCertificacion/:id*?', function (req, res, next) {

 if (req.params.id) {
    modalidadesCertificacion.findById(req.params.id, function (err, data) {
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
