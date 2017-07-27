import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { paciente, pacienteMpi } from '../../../core/mpi/schemas/paciente';
import * as express from 'express';
import * as authController from '../controller/AuthController';
import * as mongoose from 'mongoose';
import { Auth } from '../../../auth/auth.class';

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

    pacienteApp.findOne({ email }, (err, user: any) => {

        if (!user) {
            return res.status(422).send({ error: 'Cuenta inexistente' });
        }

        if (!user.activacionApp) {
            res.status(422).send({ message: 'cuenta no verificada' });
            return;
        }

        user.comparePassword(password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (isMatch) {
                // var userInfo = authController.setUserInfo(existingUser);
                let token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                res.status(200).json({
                    token: token,
                    user: user
                });
                return;
            } else {
                return res.status(422).send({ error: 'e-mail o password incorrecto' });
            }
        });
    });
});


/**
 * Cambio los datos del paciente para probar revalidar el paciente
 * Espera todos los datos del paciente más del usuario
 */

router.patch('/account', function (req, res, next) {
    let data = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        documento: req.body.documento,
        fechaNacimiento: req.body.fechaNacimiento,
        genero: req.body.sexo
    }
    let email = req.body.email;
    pacienteApp.findOne({ email: email }, function (err, account: any) {

        if (err) {
            return next(err);
        }

        if (!account || account.activacionApp) {
            return res.status(422).send({ 'email': 'account_not_foun' });
        }
        console.log(data);
        authController.matchPaciente(data).then((pacientes: any) => {
            let valid = false;
            console.log(pacientes);
            if (pacientes.length) {
                let pacienteTemp = pacientes[0].paciente;

                if (pacienteTemp.estado === 'validado') {
                    account.nombre = data.nombre;
                    account.apellido = data.apellido;
                    account.fechaNacimiento = data.fechaNacimiento;
                    account.sexo = data.genero;
                    account.documento = data.documento;
                    account.codigoVerificacion = authController.generarCodigoVerificacion();
                    account.expirationTime = new Date(Date.now() + authController.expirationOffset);
                    account.pacientes = [
                        {
                            id: pacienteTemp.id,
                            relacion: 'principal',
                            addedAt: new Date()
                        }
                    ];
                    valid = true;
                    authController.enviarCodigoVerificacion(account);
                } else {
                    account.codigoVerificacion = null;
                }
                account.save();
            }
            res.status(200).json({
                valid: valid
            });
        }).catch(err => {
            console.log(err);
            res.status(200).json({
                valid: false
            });
        });


    });
});

/**
 * Registro de un usuario desde la app mobile
 * Espera todos los datos del paciente más del usuario
 */

router.post('/registro', function (req, res, next) {
    let dataPacienteApp = {
        nombre: req.body.nombre,
        apellido: req.body.apellido,
        email: req.body.email,
        password: req.body.password,
        telefono: req.body.telefono,
        envioCodigoCount: 0,
        nacionalidad: req.body.nacionalidad,
        documento: req.body.documento,
        fechaNacimiento: req.body.fechaNacimiento,
        sexo: req.body.sexo,
        genero: req.body.genero,
        codigoVerificacion: authController.generarCodigoVerificacion(),
        expirationTime: new Date(Date.now() + authController.expirationOffset),
        permisos: [],
        pacientes: []
    }
console.log("Pacienteee ", dataPacienteApp);
    if (!dataPacienteApp.email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-Mail' });
    }

    if (!dataPacienteApp.password) {
        return res.status(422).send({ error: 'Debe ingresar una clave' });
    }

    pacienteApp.findOne({ email: dataPacienteApp.email }, function (err, existingUser) {

        if (err) {
            return next(err);
        }

        if (existingUser) {
            return res.status(422).send({ 'email': 'El e-mail ingresado está en uso' });
        }

        let user = new pacienteApp(dataPacienteApp);

        // enviarCodigoVerificacion(user);
        user.save(function (err, user: any) {

            if (err) {
                return next(err);
            }

            authController.matchPaciente(user).then(pacientes => {
                let paciente = pacientes[0].paciente;

                let valid = false;
                if (paciente.estado === 'validado') {
                    authController.enviarCodigoVerificacion(user);
                    user.pacientes = [
                        {
                            id: paciente.id,
                            relacion: 'principal',
                            addedAt: new Date()
                        }
                    ];
                    valid = true;
                } else {
                    user.codigoVerificacion = null;
                }
                user.save();

                res.status(200).json({
                    valid: valid
                });
            }).catch(err => {
                res.status(200).json({
                    valid: false
                });
            });


        });

    });

});

/**
 * Reenvío del código de verificacion
 * @param email {string} email del usuario
 */

router.post('/reenviar-codigo', function (req, res, next) {
    let email = req.body.email;
    pacienteApp.findOne({ email: email }, function (err, user: any) {
        if (!user) {
            return res.status(422).json({
                message: 'acount_not_exists'
            });
        }
        if (!user.activacionApp && user.pacientes.length > 0) {

            user.codigoVerificacion = authController.generarCodigoVerificacion();
            user.expirationTime = new Date(Date.now() + authController.expirationOffset);
            user.save(function (err, user) {
                if (err) {
                    return next(err);
                }

                authController.enviarCodigoVerificacion(user);
                res.status(200).json({
                    valid: true
                });

            });

        } else {
            if (!(user.pacientes.length > 0)) {
                res.status(422).send({ message: 'account_active' });
            } else {
                res.status(422).send({ message: 'account_not_verified' });
            }
        }

    });
});

/**
 * Verifica el código de validación enviado por mail o SMS
 * @param email {string} email del usuario
 * @param codigo {string} codigo de verificacion
 */
router.post('/verificar-codigo', function (req, res, next) {
    let email = req.body.email;
    let codigoIngresado = req.body.codigo;

    pacienteApp.findOne({ email: email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }

        if (authController.verificarCodigo(codigoIngresado, datosUsuario.codigoVerificacion)) {
            if (datosUsuario.expirationTime.getTime() + authController.expirationOffset >= new Date().getTime()) {
                datosUsuario.activacionApp = true;
                datosUsuario.estadoCodigo = true;
                datosUsuario.codigoVerificacion = null;
                datosUsuario.expirationTime = null;

                datosUsuario.save(function (err, user) {
                    if (err) {
                        return next(err);
                    }

                    let token = Auth.generatePacienteToken(String(user.id), user.nombre + ' ' + user.apellido, user.email, user.pacientes, user.permisos);
                    res.status(200).json({
                        token: token,
                        user: user
                    });
                });
            } else {
                res.status(422).send({ message: 'code_expired' });
            }
        } else {
            res.status(422).send({ message: 'code_mismatch' });
        }
    });
});


export = router;
