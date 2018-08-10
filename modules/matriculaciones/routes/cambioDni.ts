import * as express from 'express';
import * as cambioDni from '../schemas/cambioDni';
import * as utils from '../../../utils/utils';
import { Auth } from '../../../auth/auth.class';
var router = express.Router();

router.get('/cambioDni', function (req, res, next) {

    cambioDni.find(function (err, data) {
            if (err) {
                next(err);
            }

            res.status(201).json(data);
        });

    });


router.post('/cambioDni', function (req, res, next) {
    // if (!Auth.check(req, 'matriculaciones:agenda:postAgenda')) {
    //     return next(403);
    // }
    if (req.body.id) {
    cambioDni.findByIdAndUpdate(req.body.id, req.body, {
        new: true
    }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
} else {

    var newCambio = new cambioDni(req.body);
    newCambio.save((err) => {
        if (err) {
            return next(err);
        }
        res.status(201).json(newCambio);
    });

}

});


export = router;
