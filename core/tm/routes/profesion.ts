import * as express from 'express'
import * as profesion from '../schemas/profesion_model'

var router = express.Router();

router.get('/profesiones/:id*?', function(req, res, next) {

    if (req.params.id) {
        profesion.findById(req.params.id, function (err, data) {
            if (err) {
                return next(err);
            };

            res.json(data);
        });

    } else{
       
        profesion.find({}).sort({codigoSISA: 1}).exec((error, data) => {
            if (error)
                return next(error);

            res.json(data);
        });
   }
});

export = router;