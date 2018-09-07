import * as express from 'express';
import * as ultimaCarpeta from '../schemas/ultimaCarpeta';
import * as mongoose from 'mongoose';

const router = express.Router();

router.get('/ultimaCarpeta', (req: any, res, next) => {
    if (req.user.organizacion && req.user.organizacion.id) {

        const idOrganizacion = new mongoose.Types.ObjectId(req.user.organizacion.id);
        ultimaCarpeta.findOne({ idEfector: idOrganizacion }, (err, data: any) => {
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

router.post('/incrementarCuenta', (req: any, res, next) => {
    if (req.user.organizacion && req.user.organizacion.id) {
        const idOrganizacion = new mongoose.Types.ObjectId(req.user.organizacion.id);
        ultimaCarpeta.findOne({ idEfector: idOrganizacion }, (err, data: any) => {
            if (err) {
                return next(err);
            }
            if (data) {
                const update = {
                    ultimaCarpeta: data.ultimaCarpeta + 1
                };
                ultimaCarpeta.update({ idEfector: idOrganizacion }, { $set: update }, { new: true }, (errUpdate, dataUpdate) => {
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
