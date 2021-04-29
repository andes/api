import { PacienteApp } from '../schemas/pacienteApp';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as authController from '../controller/AuthController';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';

const router = express.Router();

/**
 * Edita los datos basico de la cuenta
 *
 * @param email {string} Nuevo email de la cuenta
 * @param telefono {string} Nuevo telefono de la cuenta
 * @param password {string} Nuevo password
 *
 */

router.put('/account', (req: any, res, next) => {
    const id = req.user.account_id;
    PacienteApp.findById(mongoose.Types.ObjectId(id), (err, account) => {
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

router.post('/create/:id', (req: any, res, next) => {

    const pacienteId = req.params.id;
    const contacto = req.body;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return PacienteCtr.findById(pacienteId).then((pacienteObj) => {
        authController.createUserFromPaciente(pacienteObj, contacto).then(() => {
            // Hack momentaneo. Descargamos los laboratorios a demanda.
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

router.get('/check/:id', (req: any, res, next) => {
    const pacienteId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }
    return PacienteCtr.findById(pacienteId).then((pacienteObj) => {
        authController.checkAppAccounts(pacienteObj).then((resultado) => {
            return res.send(resultado);
        }).catch((error) => {
            return res.send(error);
        });
    }).catch(() => {
        return res.send({ error: 'paciente_error' });
    });
});


/**
 * Devuelve cuenta segun email
 * @params email {string}
 */

router.get('/email/:email', async (req: any, res, next) => {
    try {
        const resp = await PacienteApp.find({ email: req.params.email });
        return res.send(resp);
    } catch (err) {
        return res.send(err);
    }
});


/**
 * Reenviar código de activación a un paciente
 *
 * @param {ObjectId} id ID del paciente
 * [DEPRECATED]
 */

router.post('/v2/reenviar-codigo', (req, res, next) => {
    const pacienteId = req.body.id;
    const contacto = req.body.contacto;
    if (!mongoose.Types.ObjectId.isValid(pacienteId)) {
        return res.status(422).send({ error: 'ObjectID Inválido' });
    }

    return PacienteCtr.findById(pacienteId).then((pacienteObj) => {
        authController.checkAppAccounts(pacienteObj).then(async (resultado: any) => {
            if (resultado.account) {
                const account = resultado.account;

                account.email = contacto.email.toLowerCase();
                account.telefono = contacto.telefono;

                const passw = authController.generarCodigoVerificacion();
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

router.patch('/account', async (req: any, res, next) => {
    const id = req.user.account_id;
    try {
        const account = await PacienteApp.findById(mongoose.Types.ObjectId(id));
        try {
            const acc = await authController.updateAccount(account, req.body);
            return res.json({ message: 'OK', account: acc });
        } catch (errUpdate) {
            return res.status(422).send(errUpdate);
        }
    } catch (e) {
        return res.status(422).send({ error: '' });
    }
});

export = router;
