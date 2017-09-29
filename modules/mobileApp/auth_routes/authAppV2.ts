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
 * Chequeo del código de verificacion sea correcto
 *
 * @param {string} email E-mail de la cuenta con la que se registro el paciente.
 * @param {string} code Código de verificación enviado al celular.
 */

router.post('/v2/check', function (req, res, next) {
    let email = req.body.email;
    let code = req.body.code;

    pacienteApp.findOne({ email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }
        if (!datosUsuario) {
            return next('no existe la cuenta');
        }
        if (authController.verificarCodigo(code, datosUsuario.codigoVerificacion)) {
            if (datosUsuario.expirationTime.getTime() + authController.expirationOffset >= new Date().getTime()) {
                res.send({ status: 'ok' });
            } else {
                return next('codigo vencido');
            }
        } else {
            return next('codigo incorrecto');
        }
    });
});

/**
 * Valida una cuenta a traves de un codigo de verificacion
 *
 * @param {string} email Email de la cuenta
 * @param {string} code Código de verificación
 * @param {string} password Password de la cuenta
 * @param {object} paciente Datos del scaneo del DNI
 */

router.post('/v2/verificar', function (req, res, next) {
    let email = req.body.email;
    let code = req.body.code;
    let password = req.body.password;
    let mpiData = req.body.paciente;


    pacienteApp.findOne({ email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }
        if (!datosUsuario) {
            return next('no existe la cuenta');
        }
        if (authController.verificarCodigo(code, datosUsuario.codigoVerificacion)) {
            if (datosUsuario.expirationTime.getTime() + authController.expirationOffset >= new Date().getTime()) {
                // Hacemos un matching entre los datos escaneados y el paciente previamente establecido
                authController.verificarCuenta(datosUsuario, mpiData).then(() => {

                    authController.habilitarCuenta(datosUsuario, password).then((user: any) => {

                        let token = Auth.generatePacienteToken(String(user._id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                        res.status(200).json({
                            token: token,
                            user: user
                        });

                    }).catch((er) => {
                        return next(er);
                    });
                }).catch(() => {
                    return next('No hay matching');
                });
            } else {
                return next('codigo vencido');
            }
        } else {
            return next('codigo incorrecto');
        }
    });
});


// [TODO] Reenviar código de activacion

// [TODO] Reset ṕassword

export = router;
