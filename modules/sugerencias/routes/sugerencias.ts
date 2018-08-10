import * as mongoose from 'mongoose';
import * as express from 'express';
import * as SendEmail from './../../../utils/roboSender/sendEmail';
import * as configPrivate from './../../../config.private';
let cheerio = require('cheerio');

// Routes
let router = express.Router();

router.post('/', function (req, res, next) {
    let body = req.body;
    let usuario: any = (req as any).user;
    req.body['usuario'] = (req as any).user.usuario.username ? (req as any).user.usuario.username : '';
    req.body['organizacion'] = (req as any).user.organizacion.nombre ? (req as any).user.organizacion.nombre : '';
    // renderizacion del email
    let html_sugerencias = SendEmail.renderHTML('emails/email-sugerencias.html', body).then(function (html) {
        let data = {
            from: configPrivate.enviarMail.auth.user,
            to: configPrivate.enviarMail.auth.user,
            subject: body.subject,
            text: body.texto,
            html,
            attachments: body.screenshot
        };
        SendEmail.sendMail(data).then(
            () => {
                res.json({
                    mensaje: 'Ok'
                });
            },
            () => {
                res.json({
                    mensaje: 'SERVICE UNAVAILABLE'
                });
            }
        );
    });
});

export = router;
