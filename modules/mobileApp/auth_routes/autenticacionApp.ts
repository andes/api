import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';

import * as express from 'express';
import * as authController from '../controller/AuthController';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import * as agenda from '../../turnos/schemas/agenda';
import * as labsImport from '../../cda/controller/import-labs';

let router = express.Router();

/**
 * Login a la app mobile
 *
 * @param email {string} email del usuario
 * @param password {string} password del usuario
 */

router.post('/login', function (req, res, next) {
    let email = req.body.email;
    let password = req.body.password;

    if (!email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-mail' });
    }

    if (!password) {
        return res.status(422).send({ error: 'Debe ingresar una clave' });
    }

    return pacienteApp.findOne({ email }, (err, user: any) => {

        if (!user) {
            return res.status(422).send({ error: 'Cuenta inexistente' });
        }

        return user.comparePassword(password, (errPassword, isMatch) => {
            if (errPassword) {
                return next(errPassword);
            }
            if (isMatch) {
                // var userInfo = authController.setUserInfo(existingUser);

                if (!user.activacionApp) {
                    if (!req.body.new_password) {
                        res.status(422).send({ message: 'new_password_needed' });
                        return;
                    } else {
                        user.password = req.body.new_password;
                        user.activacionApp = true;
                        user.save();
                    }

                }

                let token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                res.status(200).json({
                    token: token,
                    user: user
                });

                // Hack momentaneo. Descargamos los laboratorios a demanda.
                buscarPaciente(user.pacientes[0].id).then((resultado) => {
                    if (resultado.paciente) {
                        labsImport.importarDatos(resultado.paciente);
                    }
                });

                return;
            } else {
                return res.status(422).send({ error: 'e-mail o password incorrecto' });
            }
        });
    });
});

/**
 * Genera el código para poder cambiar el password y luego enviar por mail o SMS
 * @param email {string} email del usuario
 */
router.post('/olvide-password', function (req, res, next) {
    if (!req.body.email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }

    return pacienteApp.findOne({ email: req.body.email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }

        if (!datosUsuario) {
            return res.status(422).send({ 'error': 'El e-mail ingresado no existe' });
        }

        if (!datosUsuario.activacionApp) {
            return res.status(422).send({ 'error': 'El e-mail ingresado no existe' });
        }

        datosUsuario.restablecerPassword.codigo = authController.generarCodigoVerificacion();
        datosUsuario.restablecerPassword.fechaExpiracion = new Date(Date.now() + authController.expirationOffset);

        datosUsuario.save(function (errSave, user) {
            if (errSave) {
                return next(errSave);
            }

            // enviamos email de reestablecimiento de password
            authController.enviarCodigoCambioPassword(datosUsuario);

            res.status(200).json({
                valid: true
            });
        });
    });
});

/**
 * Valida el código de reset-password  y cambia la contraseña
 * @param {string} email  email del usuario
 * @param {string} codigo Codigo de verificacion
 * @param {string} password Nueva clave andes
 * @param {string} password2 Nueva clave andes
 */

router.post('/reestablecer-password', function (req, res, next) {
    if (!req.body.email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }

    if (!req.body.codigo) {
        return res.status(422).send({ error: 'Debe ingresar el código de seguridad.' });
    }

    if (!req.body.password) {
        return res.status(422).send({ error: 'Debe ingresar el nuevo password.' });
    }

    if (!req.body.password2) {
        return res.status(422).send({ error: 'Debe re ingresar el nuevo password.' });
    }

    return pacienteApp.findOne({ email: req.body.email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }

        if (!datosUsuario) {
            return res.status(422).send({ 'error': 'El e-mail ingresado no existe' });
        }

        const codigo = req.body.codigo;
        const password = req.body.password;
        const password2 = req.body.password2;

        if (datosUsuario.restablecerPassword) {
            if (datosUsuario.restablecerPassword.codigo !== codigo) {
                return res.status(422).send({ 'error': 'El codigo ingresado no existe.' });
            }

            const hoy = new Date();
            const codigoExpiracion = new Date(datosUsuario.restablecerPassword.fechaExpiracion);
            if (codigoExpiracion < hoy) {
                return res.status(422).send({ 'error': 'El código de seguridad generado ha vencido. Por favor genere uno nuevo.' });
            }

        }

        // marcamos como modificado asi se ejecuta el middleware del schema pacienteApp
        datosUsuario.password = password;
        // datosUsuario.markModified('password');

        datosUsuario.restablecerPassword = {};

        datosUsuario.save(function (errSave, user) {
            if (errSave) {
                return next(errSave);
            }

            res.status(200).json({
                valid: true
            });
        });
    });
});

export = router;
