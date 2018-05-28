import * as express from 'express';
import * as ultimaCarpeta from '../schemas/ultimaCarpeta';

let router = express.Router();

router.get('/ultimaCarpeta', function (req: any, res, next) {

    if (req.user.organizacion && req.user.organizacion.id) {
        ultimaCarpeta.find({ idEfector: req.user.organizacion.id }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    }


});


export = router;
