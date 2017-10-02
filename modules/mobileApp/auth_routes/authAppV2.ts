import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as authController from '../controller/AuthController';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';
import * as agenda from '../../turnos/schemas/agenda';

let router = express.Router();

/**
 * Obtenemos una cuenta desde un codigo y un email (opcional)
 * @param code
 * @param email
 */

function getAccount(code, email) {
    return pacienteApp.findOne({ codigoVerificacion: code }).then((datosUsuario: any) => {
        if (!datosUsuario) {
            return Promise.reject('no existe la cuenta');
        }
        console.log(datosUsuario);
        if (datosUsuario.expirationTime.getTime() >= new Date().getTime()) {

            if (datosUsuario.email && datosUsuario.email !== email) {
                return Promise.reject('no existe la cuenta');
            }

            datosUsuario.email = email;
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

    getAccount(code, email).then(() => {
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

    getAccount(code, email).then((datosUsuario) => {
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

    getAccount(code, email).then((datosUsuario) => {
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


// [TODO] Reenviar código de activacion

// [TODO] Reset ṕassword

export = router;
