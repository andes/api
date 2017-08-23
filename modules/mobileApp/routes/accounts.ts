import { pacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as authController from '../controller/AuthController';

let router = express.Router();

/**
 * Edita los datos basico de la cuenta
 *
 * @param email {string} Nuevo email de la cuenta
 * @param telefono {string} Nuevo telefono de la cuenta
 * @param password {string} Nuevo password
 *
 */

router.put('/account', function (req: any, res, next) {
    let id = req.user.account_id;
    pacienteApp.findById(mongoose.Types.ObjectId(id), (err, account: any) => {
        if (!account) {
            return res.status(422).send({ error: '' });
        }

        return authController.updateAccount(account, req.body).then((acc) => {
            return res.json({ message: 'OK', account: acc });
        }).catch((errUpdate) => {
            return res.status(422).send(errUpdate);
        })

    });
});

export = router;
