const nodemailer = require('nodemailer');

import * as configPrivate from '../config.private';

export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

export function sendMail(options: MailOptions) {
    let transporter = nodemailer.createTransport({
        host: 'exchange2010.hospitalneuquen.org.ar',
        port: 25
    });

    let mailOptions = {
        from: options.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log("Error al mandar mail: ", error);
        }

        console.log('Mensaje %s enviado: %s', info.messageId, info.response);
    });
}