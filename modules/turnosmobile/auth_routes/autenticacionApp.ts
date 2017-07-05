import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { authApp } from '../../../config.private';
// const nodemailer = require('nodemailer');
import * as express from 'express';
import { Client } from 'elasticsearch';
import * as config from '../../../config';
import * as configPrivate from '../../../config.private';
import { sendMail, MailOptions } from '../../../utils/sendMail';
import * as moment from 'moment';
import { matching } from '@andes/match';

let router = express.Router();
const expirationOffset = 1000 * 60 * 60 * 24;

router.post('/login', function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;

    if (!email) {
        return res.status(422).send({ error: 'Se debe ingresar una dirección de e-mail' });
    }

    if (!password) {
        return res.status(422).send({ error: 'Debe ingresar una clave' });
    }

    pacienteApp.findOne({ email }, (err, existingUser: any) => {

        if (err) {
            return next(err);
        }

        if (!existingUser.activacionApp) {
            res.status(422).send({ message: 'cuenta no verificada' });
            return;
        }

        existingUser.comparePassword(password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (isMatch) {
                var userInfo = setUserInfo(existingUser);
                res.status(200).json({
                    token: 'JWT ' + generateToken(userInfo),
                    user: existingUser
                });
                return;
            } else {
                return res.status(422).send({ error: 'e-mail o password incorrecto' });
            }
        });
    });
    /*
    
    */
});

router.post('/registro', function (req, res, next) {
    var dataPacienteApp = {
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
        codigoVerificacion: generarCodigoVerificacion(),
        expirationTime: new Date(Date.now() + expirationOffset),
        permisos: []
    }

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

        var user = new pacienteApp(dataPacienteApp);

        enviarCodigoVerificacion(user);
        user.save(function (err, user: any) {

            if (err) {
                return next(err);
            }

            matchPaciente(user).then(pacientes => {
                let paciente = pacientes[0].paciente;

                let valid = false;
                if (paciente.estado == 'validado') {
                    enviarCodigoVerificacion(user);
                    user.idPaciente = paciente.id;
                    user.save();
                    valid = true;
                }

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

router.post('/reenviar-codigo', function (req, res, next) {
    let email = req.body.email;
    pacienteApp.findOne({ email: email }, function (err, user: any) {
        if (!user) {
            return res.status(422).json({
                message: 'acount_not_exists'
            });
        }
        if (!user.activacionApp && user.idPaciente) {

            user.codigoVerificacion = generarCodigoVerificacion();
            user.expirationTime = new Date(Date.now() + expirationOffset);
            user.save(function (err, user) {
                if (err) {
                    return next(err);
                }

                enviarCodigoVerificacion(user);
                res.status(200).json({
                    valid: true
                });

            });

        } else {
            if (!user.idPaciente) {
                res.status(422).send({ message: 'account_active' });
            } else {
                res.status(422).send({ message: 'account_not_verified' });
            }
        }

    });
});

//Verifica el código de validación enviado por mail o SMS
router.post('/verificar-codigo', function (req, res, next) {
    let email = req.body.email;
    let codigoIngresado = req.body.codigo;

    pacienteApp.findOne({ email: email }, function (err, datosUsuario: any) {
        if (err) {
            return next(err);
        }
        if (verificarCodigo(codigoIngresado, datosUsuario.codigoVerificacion)) {
            if (datosUsuario.expirationTime.getTime() + expirationOffset >= new Date().getTime()) {
                datosUsuario.activacionApp = true;
                datosUsuario.estadoCodigo = true;
                datosUsuario.codigoVerificacion = null;
                datosUsuario.expirationTime = null;

                datosUsuario.save(function (err, user) {
                    if (err) {
                        return next(err);
                    }

                    var userInfo = setUserInfo(user);
                    res.status(200).json({
                        token: 'JWT ' + generateToken(userInfo),
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

function verificarCodigo(codigoIngresado, codigo) {
    if (codigoIngresado === codigo)
        return true
    else
        return false
}

function enviarCodigoVerificacion(user) {
    console.log("Enviando mail...");

    let options: MailOptions = {
        from: configPrivate.enviarMail.options.from,
        to: user.nombre,
        subject: 'Hola ' + user.email,
        text: 'Ingrese su código de verificación en la app',
        html: 'El código de verificación es: ' + user.codigoVerificacion
    };

    sendMail(options);
}

function envioCodigoCount(user: any) {
    //TODO: Implementar si se decide poner un límite al envío de códigos    
}

function generateToken(user) {
    return jwt.sign(user, authApp.secret, {
        expiresIn: 10080
    });
}

function generarCodigoVerificacion() {
    let codigo = "";
    let length = 6;
    let caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return codigo;
}

function setUserInfo(request) {
    return {
        _id: request._id,
        email: request.email,
        idPaciente: request.idPaciente,
        permisos: request.permisos
    };
}

function matchPaciente(data) {
    return new Promise((resolve, reject) => {

        let connElastic = new Client({
            host: configPrivate.hosts.elastic_main,
        });

        let campo = 'documento';
        let condicionMatch = {};
        condicionMatch[campo] = {
            query: data.documento,
            minimum_should_match: 3,
            fuzziness: 2
        };
        let query = {
            match: condicionMatch
        };
        let body = {
            size: 100,
            from: 0,
            query: query
        };
        connElastic.search({
            index: 'andes',
            body: body
        }).then((searchResult) => {

            // Asigno los valores para el suggest
            let weights = config.mpi.weightsDefault;

            // if (req.query.escaneado) {
            //     weights = config.mpi.weightsScan;
            // }

            let porcentajeMatchMax = config.mpi.cotaMatchMax;
            let porcentajeMatchMin = config.mpi.cotaMatchMin;
            let listaPacientesMax = [];
            let listaPacientesMin = [];
            // let devolverPorcentaje = data.percentage;

            let results: Array<any> = ((searchResult.hits || {}).hits || []) // extract results from elastic response
                .filter(function (hit) {
                    let paciente = hit._source;
                    let pacDto = {
                        documento: data.documento ? data.documento.toString() : '',
                        nombre: data.nombre ? data.nombre : '',
                        apellido: data.apellido ? data.apellido : '',
                        fechaNacimiento: data.fechaNacimiento ? data.fechaNacimiento : '',
                        sexo: data.genero ? data.genero : ''
                    };
                    let pacElastic = {
                        documento: paciente.documento ? paciente.documento.toString() : '',
                        nombre: paciente.nombre ? paciente.nombre : '',
                        apellido: paciente.apellido ? paciente.apellido : '',
                        fechaNacimiento: paciente.fechaNacimiento ? moment(paciente.fechaNacimiento).format('YYYY-MM-DD') : '',
                        sexo: paciente.sexo ? paciente.sexo : ''
                    };
                    let match = new matching();
                    let valorMatching = match.matchPersonas(pacElastic, pacDto, weights);
                    paciente['id'] = hit._id;

                    if (valorMatching >= porcentajeMatchMax) {
                        listaPacientesMax.push({
                            id: hit._id,
                            paciente: paciente,
                            match: valorMatching
                        });
                    } else {
                        if (valorMatching >= porcentajeMatchMin && valorMatching < porcentajeMatchMax) {
                            listaPacientesMin.push({
                                id: hit._id,
                                paciente: paciente,
                                match: valorMatching
                            });
                        }
                    }
                    // console.log("SEARCHRESULT-------------",paciente.documento,paciente.apellido,valorMatching);
                });

            // if (devolverPorcentaje) {
            let sortMatching = function (a, b) {
                return b.match - a.match;
            };

            // cambiamos la condición para lograr que nos devuelva más de una sugerencia
            // ya que la 1ra sugerencia es el mismo paciente.
            // if (listaPacientesMax.length > 0) {
            if (listaPacientesMax.length > 0) {
                listaPacientesMax.sort(sortMatching);
                resolve(listaPacientesMax);
            } else {
                listaPacientesMin.sort(sortMatching);
                resolve(listaPacientesMin);
            }
            // } else {
            //     results = results.map((hit) => {
            //         let elem = hit._source;
            //         elem['id'] = hit._id;
            //         return elem;
            //     });
            //     res.send(results);
            // }
        }).catch((error) => {
            reject(error);
        });
    });
}


export = router;