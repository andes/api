import { pacienteApp as PacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as authController from '../controller/AuthController';
import * as controllerPaciente from '../../../core/mpi/controller/paciente';
import * as labsImport from '../../cda/controller/import-labs';

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
    PacienteApp.findById(mongoose.Types.ObjectId(id), (err, account: any) => {
        if (!account) {
            return res.status(422).send({ error: '' });
        }

        return authController.updateAccount(account, req.body).then((acc) => {
            return res.json({ message: 'OK', account: acc });
        }).catch((errUpdate) => {
            return res.status(422).send(errUpdate);
        });
    });
});


/**
 * Crea un usuario apartir de un paciente
 * @param id {string} ID del paciente a crear
 */

router.post('/create/:id', function (req: any, res, next) {

    let pacienteId = req.params.id;
    let contacto = req.body;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;

        authController.createUserFromPaciente(pacienteObj, contacto).then(() => {
            // Hack momentaneo. Descargamos los laboratorios a demanda.
            labsImport.importarDatos(pacienteObj);
            return res.send({ message: 'OK' });
        }).catch((error) => {
            return res.send(error);
        });

    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });

});


/**
 * Check estado de la cuenta
 * @param id {string} ID del paciente a chequear
 */

router.get('/check/:id', function (req: any, res, next) {
    let pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;
        authController.checkAppAccounts(pacienteObj).then((resultado2) => {
            return res.send(resultado2);
        }).catch((error) => {
            return res.send(error);
        });
    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });
});


/**
 * Reenviar código de activación a un paciente
 *
 * @param {ObjectId} id ID del paciente
 * [DEPRECATED]
 */

router.post('/v2/reenviar-codigo', (req, res, next) => {
    let pacienteId = req.body.id;
    let contacto = req.body.contacto;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }

    return controllerPaciente.buscarPaciente(pacienteId).then((resultado) => {
        let pacienteObj = resultado.paciente;
        authController.checkAppAccounts(pacienteObj).then(async (resultado2: any) => {
            if (resultado2.account) {
                let account = resultado2.account;

                account.email = contacto.email;
                account.telefono = contacto.telefono;

                let passw = authController.generarCodigoVerificacion();
                account.password = passw;

                account.save((errSave, userSaved: any) => {
                    if (errSave) {
                        return res.send({ error: 'paciente_error' });
                    }
                    authController.enviarCodigoVerificacion(userSaved, passw);
                    return res.json({ status: 'OK' });
                });
            }
        }).catch((error) => {
            return res.send(error);
        });
    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });
});


export = router;
