import * as express from 'express';
import * as ultimaCarpeta from '../schemas/ultimaCarpeta';
import { mongooseDebugMode } from '../../../config.private';
import * as mongoose from 'mongoose';

let router = express.Router();

router.get('/ultimaCarpeta', function (req: any, res, next) {
    if (req.user.organizacion && req.user.organizacion.id) {

        let idOrganizacion = new mongoose.Types.ObjectId(req.user.organizacion.id);
        ultimaCarpeta.findOne({ idEfector: idOrganizacion }, function (err, data: any) {
            if (err) {
                return next(err);
            }
            if (data) {
                data.ultimaCarpeta = data.ultimaCarpeta + 1;
                res.json(data.ultimaCarpeta);
            } else {
                res.json(0);
            }
        });
    }
});

router.post('/incrementarCuenta', function (req: any, res, next) {
    if (req.user.organizacion && req.user.organizacion.id) {
        let idOrganizacion = new mongoose.Types.ObjectId(req.user.organizacion.id);
        ultimaCarpeta.findOne({ idEfector: idOrganizacion }, function (err, data: any) {
            if (err) {
                return next(err);
            }
            if (data) {
                let update = {
                    ultimaCarpeta: data.ultimaCarpeta + 1
                };
                ultimaCarpeta.update({ idEfector: idOrganizacion }, { $set: update }, { new: true }, function (errUpdate, dataUpdate) {
                    if (err) {
                        return next(errUpdate);
                    }
                    res.json(dataUpdate);
                });
            } else {
                res.json();
            }
        });
    }
});

export = router;
