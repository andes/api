import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as authController from '../controller/AuthController';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import * as agenda from '../../turnos/schemas/agenda';
import * as moment from 'moment';

let router = express.Router();
// let emailRegex = /^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$/;
let emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,15}$/;

function codeTostring(code) {
    let c = String(code);
    while (c.length < 6) {
        c = '0' + c;
    }
    return c;
}

/**
 * Obtenemos una cuenta desde un codigo y un email (opcional)
 * @param code
 * @param email
 */

function getAccount(code, email) {
    if (!emailRegex.test(email)) {
        return Promise.reject('email invalido');
    }

    return pacienteApp.findOne({ codigoVerificacion: code }).then((datosUsuario: any) => {
        if (!datosUsuario) {
            return Promise.reject('no existe la cuenta');
        }
        if (datosUsuario.expirationTime.getTime() >= new Date().getTime()) {

            if (datosUsuario.email && datosUsuario.email !== email) {
                return Promise.reject('no existe la cuenta');
            } else if (!datosUsuario.email) {
                // el usuario puede elegir el email. Cuando se envia el codigo de forma automatia
                // chequemos que el emial que eligio el usuario no exista
                return pacienteApp.findOne({email: email}).then(existsEmail => {
                    if (!existsEmail) {
                        datosUsuario.email = email;
                        return Promise.resolve(datosUsuario);
                    } else {
                        return Promise.reject('email existente');
                    }
                });
            }

            return Promise.resolve(datosUsuario);

        } else {
            return Promise.reject('codigo vencido');
        }

    });
}



/**
 * Chequeo del código de verificacion sea correcto
 *
 * @param {string} email E-mail de la cuenta con la que se registro el paciente.
 * @param {string} code Código de verificación enviado al celular.
 */

router.post('/v2/check', function (req, res, next) {
    let email = req.body.email;
    let code = req.body.code;
    if (!email || !code) {
        return next('faltan datos');
    }
    getAccount(codeTostring(code), email).then(() => {
        res.send({ status: 'ok' });
    }).catch((err) => {
        return next(err);
    });
});

/**
 * Crea un matching del paciente con el scan del DNI para tener un doble control
 *
 * @param {string} email Email de la cuenta
 * @param {string} code Código de verificación
 * @param {object} paciente Datos del scaneo del DNI
 */

router.post('/v2/verificar', function (req, res, next) {
    let email = req.body.email;
    let code = req.body.code;
    let mpiData = req.body.paciente;
    if (!email || !code) {
        return next('faltan datos');
    }

    getAccount(codeTostring(code), email).then((datosUsuario) => {
        authController.verificarCuenta(datosUsuario, mpiData).then(() => {
            res.send({ status: 'ok' });
        }).catch(() => {
            return next('No hay matching');
        });
    }).catch((err) => {
        return next(err);
    });
});

/**
 * Habilita una cuenta a traves de un código de verificación
 *
 * @param {string} email Email de la cuenta
 * @param {string} code Código de verificación
 * @param {string} password Password de la cuenta
 * @param {object} paciente Datos del scaneo del DNI
 */

router.post('/v2/registrar', function (req, res, next) {
    let email = req.body.email;
    let code = req.body.code;
    let password = req.body.password;
    // let mpiData = req.body.paciente;

    if (!email || !code || !password) {
        return next('faltan datos');
    }

    getAccount(codeTostring(code), email).then((datosUsuario) => {
        // [TODO] 02/10 se decide sacar el matching por un cierto tiempo
        // authController.verificarCuenta(datosUsuario, mpiData).then(() => {
            authController.habilitarCuenta(datosUsuario, password).then((user: any) => {
                let token = Auth.generatePacienteToken(String(user._id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                res.status(200).json({
                    token: token,
                    user: user
                });

            }).catch((er) => {
                return next(er);
            });
        /*
        }).catch(() => {
            return next('No hay matching');
        });
        */
    }).catch((err) => {
        return next(err);
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

router.post('/check-update', function(req, res, next) {
    let app_version = req.body.app_version;
    // Por el momento devolvemos que todo esta bien
    return res.json({status: 'ok'});

    // new-version advierte al usuario que hay una nueva versión
    // return res.json({status: 'new-version'});

    // Después de determinada fecha no la puede usar más.
    // let days =  Math.ceil(moment().add(1, 'days').diff(moment(), 'days', true));
    // return res.json({status: 'update-require' }); // calcular en base a días

});

export = router;
