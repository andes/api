import * as jwt from 'jsonwebtoken';
import { pacienteApp } from '../schemas/pacienteApp';
import { authApp } from '../../../config.private';
const nodemailer = require('nodemailer');
import * as express from 'express';

let router = express.Router();

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

        existingUser.comparePassword(password, (err, isMatch) => {
            if (err) {
                return next(err);
            }
            if (isMatch) {

                var userInfo = setUserInfo(existingUser);

                res.status(200).json({
                    token: 'JWT ' + generateToken(userInfo),
                    user: userInfo
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
        nacionalidad: req.body.nacionalidad,
        documento: req.body.documento,
        sexo: req.body.sexo,
        genero: req.body.genero,
        codigoVerificacion: generarCodigoVerificacion()
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

        var user = new pacienteApp(
            dataPacienteApp
        );

        user.save(function (err, user) {

            if (err) {
                return next(err);
            }

            var userInfo = setUserInfo(user);
            console.log("User", user);
            enviarCodigoVerificacion(user);

            res.status(201).json({
                token: 'JWT ' + generateToken(userInfo),
                user: user
            })

        });

    });

});


function enviarCodigoVerificacion(user) {
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // secure:true for port 465, secure:false for port 587
        auth: {
            user: 'publicacionsaludnqn@gmail.com',
            pass: 'saludnqn'
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Salud 👻" <publicacionsaludnqn@gmail.com>', // sender address
        to: user.email, // list of receivers
        subject: 'Hola ' + user.nombre + ' ✔', // Subject line
        text: 'Ingrese su código de verificación en la app', // plain text body
        html: '<b>El código es: ' + user.codigoVerificacion + '</b>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
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
        email: request.email
    };
}


export = router;