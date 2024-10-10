import { EventCore } from '@andes/event-bus';
import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import * as configPrivate from '../../../config.private';
import { extractFoto, findOrCreate } from '../../../core-v2/mpi/paciente/paciente.controller';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { validar } from '../../../core-v2/mpi/validacion';
import * as ScanParse from '../../../shared/scanParse';
import * as authController from '../controller/AuthController';
import { enviarCodigoVerificacion, generarCodigoVerificacion } from '../controller/AuthController';
import { PacienteAppCtr } from '../pacienteApp.routes';
import { registroMobileLog } from '../registroMobile.log';
import { PacienteApp } from '../schemas/pacienteApp';
import * as SendEmail from './../../../utils/roboSender/sendEmail';

import moment = require('moment');

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

    return PacienteApp.findOne({ email }, (err, user) => {

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
                    }

                }

                await authController.updateAccount(user, { lastLogin: new Date() });
                const token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                res.status(200).json({
                    token,
                    user
                });

                const paciente: any = await PacienteCtr.findById(user.pacientes[0].id);
                if (paciente) {
                    user.pacientes[0] = paciente.basicos();
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
    return PacienteApp.findOne({ email }, (err, datosUsuario: any) => {
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
            authController.enviarCodigoCambioPassword(datosUsuario, req.body.origen);

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
    return PacienteApp.findOne({ email }, (err, datosUsuario: any) => {
        if (err) {
            return next(err);
        }

        if (!datosUsuario) {
            return res.status(422).send({ error: 'El e-mail ingresado no existe o venció el plazo para su activación.' });
        }

        const codigo = req.body.codigo;
        const password = req.body.password;

        if (datosUsuario.restablecerPassword) {
            if (datosUsuario.restablecerPassword.codigo !== codigo) {
                return res.status(422).send({ error: 'El codigo ingresado no existe o ya fue utilizado.' });
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
    const html = await SendEmail.renderHTML('emails/emailGenerico.html', body);

    const adjuntos = body.adjuntos.map(x => {
        x.content = x.content.split('base64,')[1];
    });
    const data = {
        to: body.emails,
        subject: body.asunto,
        html,
        attachments: body.adjuntos
    };

    const respuesta = await SendEmail.sendMail(data);
    return res.json(respuesta);
});

router.post('/registro', Auth.validateCaptcha(), async (req: any, res, next) => {
    try {
        const scanText = req.body.scanText;
        const email = req.body.email;
        const fcmToken = req.body.fcmToken;

        if (!ScanParse.isValid(scanText)) {
            return res.status(400).send('Documento Inválido.');
        }

        const documentoScan: any = ScanParse.scan(scanText);

        // TODO: Llevar funcionalidad a controller
        const cuentas = await PacienteAppCtr.search({ documento: documentoScan.documento, sexo: documentoScan.sexo, activacionApp: true });

        // Verifica si el paciente se encuentra registrado y activo en la app mobile
        const cuentaPaciente = cuentas.filter(c => { return c.pacientes.length; });
        if (cuentaPaciente.length > 0) {
            return res.status(404).send('Ya existe una cuenta activa asociada a su documento');
        }
        const pacienteApp = await PacienteAppCtr.findOne({ email });
        if (pacienteApp) {
            if (pacienteApp.activacionApp) { // si existe y está activa es porque el mail esta vinculado a otro DNI
                return res.status(404).send('Ya existe una cuenta activa con ese e-mail');
            } else { // existe una cuenta con ese mail pero sin activar. Se elimina y a continuacion se vuelve a crear
                await PacienteAppCtr.remove(pacienteApp.id);
            }
        }

        req.body.validado = false;
        req.body.estado = 'pendiente';

        const usarNroTramite = false;

        // Realiza la búsqueda en Renaper
        const pacienteValidado = await validar(documentoScan.documento, documentoScan.sexo.toLocaleLowerCase());
        if (pacienteValidado) {
            if (usarNroTramite) {
                const tramite = Number(documentoScan.tramite);
                // Verifica el número de trámite
                if (pacienteValidado.idTramite !== tramite) {
                    return res.status(404).send('Número de trámite inválido');
                }
                // Guarda la foto de RENAPER en Andes
                await extractFoto(pacienteValidado, configPrivate.userScheduler);
            }
            req.body.nombre = pacienteValidado.nombre;
            req.body.apellido = pacienteValidado.apellido;
            req.body.fechaNacimiento = pacienteValidado.fechaNacimiento;
            req.body.validado = true;
        } else {
            await registroMobileLog.error(
                'validacion',
                { documento: documentoScan.documento, sexo: documentoScan.sexo, scan: scanText },
                'Error validando paciente al registrar cuenta',
                req
            );
            return res.status(404).send('No es posible verificar su identidad.');
        }

        // Busca el paciente y si no existe lo crea
        const paciente = await findOrCreate(pacienteValidado, configPrivate.userScheduler);

        let registro = {};
        if (paciente && paciente.id) {
            const passw = generarCodigoVerificacion();
            req.body.pacientes = [{
                id: paciente.id,
                relacion: 'principal',
                addedAt: new Date()
            }];
            req.body.password = passw;
            registro = await PacienteAppCtr.create(req.body, req);

            // Push Notification
            enviarCodigoVerificacion(registro, passw, fcmToken);
        }
        return res.json(registro);
    } catch (err) {
        return next(err);
    }
});

router.get('/documento/:documento', async (req: any, res, next) => {
    try {
        const resp = await PacienteApp.find({ documento: req.params.documento });
        return res.send(resp);
    } catch (err) {
        return res.send(err);
    }
});

export = router;
