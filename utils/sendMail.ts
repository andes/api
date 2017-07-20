const nodemailer = require('nodemailer');
const sendmail = require('sendmail')();

import * as configPrivate from '../config.private';

export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

export function sendMail(options: MailOptions) {
    sendmail({
        from: 'andessalud@hospitalneuquen.org.ar',
        to: 'pichi12@gmail.com',
        subject: 'test sendmail',
        html: 'Mail of test sendmail ',
    }, function (err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    });

    // let transporter = nodemailer.createTransport({
    //     host: configPrivate.enviarMail.host,
    //     port: configPrivate.enviarMail.port,
    //     secure: configPrivate.enviarMail.secure,
    //     auth: {
    //         user: configPrivate.enviarMail.auth.user,
    //         pass: configPrivate.enviarMail.auth.pass
    //     }
    // });

    // let mailOptions = {
    //     from: options.from,
    //     to: options.to,
    //     subject: options.subject,
    //     text: options.text,
    //     html: options.html
    // };

    // transporter.sendMail(mailOptions, (error, info) => {
    //     if (error) {
    //         return console.log("Error al mandar mail: ", error);
    //     }

    //     console.log('Mensaje %s enviado: %s', info.messageId, info.response);
    // });
}