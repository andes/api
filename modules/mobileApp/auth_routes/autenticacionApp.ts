import { pacienteApp } from '../schemas/pacienteApp';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import * as express from 'express';
import * as authController from '../controller/AuthController';
import { Auth } from '../../../auth/auth.class';
import { EventCore } from '@andes/event-bus';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from '../../../config.private';
import { asyncify } from 'async';

const router = express.Router();

/**
 * Login a la app mobile
 *
 * @param email {string} email del usuario
 * @param password {string} password del usuario
 */

router.post('/login', (req, res, next) => {
    const email = (req.body.email) ? req.body.email.toLowerCase() : null;
    const password = req.body.password;

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

        return user.comparePassword(password, async (errPassword, isMatch) => {
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
                        await authController.updateAccount(user, { lastLogin: new Date() });
                    }

                }

                const token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                res.status(200).json({
                    token,
                    user
                });

                let resultado = await buscarPaciente(user.pacientes[0].id);
                if (resultado.paciente) {
                    user.pacientes[0] = resultado.paciente.basicos();
                    EventCore.emitAsync('mobile:patient:login', user);
                }
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
router.post('/olvide-password', (req, res, next) => {
    if (!req.body.email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }
    const email = req.body.email.toLowerCase();
    return pacienteApp.findOne({ email }, (err, datosUsuario: any) => {
        if (err) {
            return next(err);
        }

        if (!datosUsuario) {
            return res.status(422).send({ error: 'El e-mail ingresado no existe' });
        }

        if (!datosUsuario.activacionApp) {
            return res.status(422).send({ error: 'El e-mail ingresado no existe' });
        }

        datosUsuario.restablecerPassword.codigo = authController.generarCodigoVerificacion();
        datosUsuario.restablecerPassword.fechaExpiracion = new Date(Date.now() + authController.expirationOffset);

        datosUsuario.save((errSave, user) => {
            if (errSave) {
                return next(errSave);
            }

            EventCore.emitAsync('mobile:patient:reset-password', user);
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

router.post('/reestablecer-password', (req, res, next) => {
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
    const email = req.body.email.toLowerCase();
    return pacienteApp.findOne({ email }, (err, datosUsuario: any) => {
        if (err) {
            return next(err);
        }

        if (!datosUsuario) {
            return res.status(422).send({ error: 'El e-mail ingresado no existe' });
        }

        const codigo = req.body.codigo;
        const password = req.body.password;

        if (datosUsuario.restablecerPassword) {
            if (datosUsuario.restablecerPassword.codigo !== codigo) {
                return res.status(422).send({ error: 'El codigo ingresado no existe.' });
            }

            const hoy = new Date();
            const codigoExpiracion = new Date(datosUsuario.restablecerPassword.fechaExpiracion);
            if (codigoExpiracion < hoy) {
                return res.status(422).send({ error: 'El código de seguridad generado ha vencido. Por favor genere uno nuevo.' });
            }

        }

        // marcamos como modificado asi se ejecuta el middleware del schema pacienteApp
        datosUsuario.password = password;
        // datosUsuario.markModified('password');

        datosUsuario.restablecerPassword = {};

        datosUsuario.save((errSave, user) => {
            if (errSave) {
                return next(errSave);
            }

            res.status(200).json({
                valid: true
            });
            EventCore.emitAsync('mobile:patient:reset-password', user);

        });
    });
});


/**
 * envio de emails desde la app mobile
 * @param {string} email  email del usuario
 */
router.post('/mailGenerico', async (req, res, next) => {
    if (!req.body.emails) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }
    const body = req.body;
    const usuario: any = (req as any).user;
    // req.body['usuario'] = usuario.usuario.username ? usuario.usuario.username : '';
    // req.body['organizacion'] = usuario.organizacion.nombre ? usuario.organizacion.nombre : '';
    // renderizacion del email
    let html = await SendEmail.renderHTML('emails/emailGenerico.html', body);

    let adjuntos = body.adjuntos.map(x => {
        x.content = x.content.split('base64,')[1];
    });
    const data = {
        from: configPrivate.enviarMail.auth.user,
        to: body.emails,
        subject: body.asunto,
        text: '',
        html,
        attachments: body.adjuntos
    };

    let respuesta = await SendEmail.sendMail(data);
    return res.json(respuesta);
});

export = router;
