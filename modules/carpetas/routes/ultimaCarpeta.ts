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

router.post('/incrementarCuenta', function (req: any, res, next) {

    if (req.user.organizacion && req.user.organizacion.id) {
        ultimaCarpeta.findOne({ idEfector: req.user.organizacion.id }, function (err, data: any) {
            if (err) {
                return next(err);
            }
            let update = {
                ultimaCarpeta: data.ultimaCarpeta + 1
            };
            ultimaCarpeta.update({ idEfector: req.user.organizacion.id }, { $set: update }, { new: true }, function (errUpdate, dataUpdate) {
                if (err) {
                    return next(errUpdate);
                }
                res.json(dataUpdate);
            });
        });
    }


});


export = router;
