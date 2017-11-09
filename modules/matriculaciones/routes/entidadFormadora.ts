import * as express from 'express'
import * as entidadFormadora from '../schemas/entidadFormadora'

var router = express.Router();

router.get('/entidadesFormadoras/:id*?', function (req, res, next) {

 if (req.params.id) {
        entidadFormadora.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            };

            res.json(data);
        });

    } else{
       
        entidadFormadora.find({}).sort({codigoSISA: 1}).exec((error, data) => {
            if (error)
                return next(error);

            res.json(data);
        });
   }
    
});


export = router;