import { PacienteApp } from '../schemas/pacienteApp';
import { buscarPaciente } from '../../../core/mpi/controller/paciente';
import * as express from 'express';
import * as authController from '../controller/AuthController';
import { Auth } from '../../../auth/auth.class';
import * as labsImport from '../../../modules/cda/controller/import-labs';

const router = express.Router();

/**
 * Login a la app mobile
 *
 * @param email {string} email del usuario
 * @param password {string} password del usuario
 */

router.post('/login', async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    if (!email) {
        return res.status(422).send({ message: 'Se debe ingresar una dirección de e-mail' });
    }

    if (!password) {
        return res.status(422).send({ message: 'Debe ingresar una clave' });
    }

    let user = await PacienteApp.findOne({ email });
    if (!user) {
        return res.status(422).send({ error: 'Cuenta inexistente' });
    }

    let isMatch = await user.comparePassword(password);

    if (isMatch) {

        if (!user.activacionApp) {
            if (!req.body.new_password) {
                return res.status(422).send({ message: 'new_password_needed' });
            } else {
                user.password = req.body.new_password;
                user.activacionApp = true;
                await user.save();
            }

        }

        const token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email.toString(), user.pacientes, user.permisos);
        res.status(200).json({
            token,
            user
        });

        // Hack momentaneo. Descargamos los laboratorios a demanda.
        if (user.pacientes.length > 0) {
            buscarPaciente(user.pacientes[0].id).then((resultado) => {
                if (resultado.paciente) {
                    labsImport.importarDatos(resultado.paciente);
                }
            });
        }

        return res;
    } else {
        return res.status(422).send({ error: 'e-mail o password incorrecto' });
    }
});

/**
 * Genera el código para poder cambiar el password y luego enviar por mail o SMS
 * @param email {string} email del usuario
 */
router.post('/olvide-password', async (req, res, next) => {
    if (!req.body.email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }

    let cuentaPaciente = await PacienteApp.findOne({ email: req.body.email });

    if (!cuentaPaciente || !cuentaPaciente.activacionApp) {
        return res.status(422).send({ error: 'El e-mail ingresado no existe' });
    }

    cuentaPaciente.restablecerPassword.codigo = authController.generarCodigoVerificacion();
    cuentaPaciente.restablecerPassword.fechaExpiracion = new Date(Date.now() + authController.expirationOffset);

    await cuentaPaciente.save();

    // enviamos email de reestablecimiento de password
    authController.enviarCodigoCambioPassword(cuentaPaciente);

    return res.status(200).json({
        valid: true
    });
});

/**
 * Valida el código de reset-password  y cambia la contraseña
 * @param {string} email  email del usuario
 * @param {string} codigo Codigo de verificacion
 * @param {string} password Nueva clave andes
 * @param {string} password2 Nueva clave andes
 */

router.post('/reestablecer-password', async (req, res, next) => {
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

    let cuentaPaciente = await PacienteApp.findOne({ email: req.body.email });
    if (!cuentaPaciente) {
        return res.status(422).send({ error: 'El e-mail ingresado no existe' });
    }

    const codigo = req.body.codigo;
    const password = req.body.password;

    if (cuentaPaciente.restablecerPassword) {
        if (cuentaPaciente.restablecerPassword.codigo !== codigo) {
            return res.status(422).send({ error: 'El codigo ingresado no existe.' });
        }
        const hoy = new Date();
        const codigoExpiracion = new Date(cuentaPaciente.restablecerPassword.fechaExpiracion);
        if (codigoExpiracion < hoy) {
            return res.status(422).send({ error: 'El código de seguridad generado ha vencido. Por favor genere uno nuevo.' });
        }
    }

    // marcamos como modificado asi se ejecuta el middleware del schema pacienteApp
    cuentaPaciente.password = password;
    // cuentaPaciente.markModified('password');

    cuentaPaciente.restablecerPassword = null;

    await cuentaPaciente.save();

    return res.status(200).json({
        valid: true
    });
});

/**
 * Avisa a la appMobile si hay una nueva versión y si es obligatorio actualizar
 *
 * Implementar la logica a medida que evoluciona la appMobile
 *
 * ok: Indica que todo esta bien.
 * new-version:  Advierte de una nueva versión para descargar.
 * update-require: Pone un plazo máximo de días para actualizar.
 *
 */

router.post('/check-update', (req, res, next) => {
    // let app_version = req.body.app_version;
    // Por el momento devolvemos que todo esta bien
    return res.json({status: 'ok'});

    // new-version advierte al usuario que hay una nueva versión
    // return res.json({status: 'new-version'});

    // Después de determinada fecha no la puede usar más.
    // let days =  Math.ceil(moment().add(1, 'days').diff(moment(), 'days', true));
    // return res.json({status: 'update-require' }); // calcular en base a días

});
export = router;
