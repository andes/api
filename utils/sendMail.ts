const nodemailer = require('nodemailer');

import { enviarMail } from '../config.private';
import * as debug from 'debug';

let log = debug('sendMail');
export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

export function sendMail(options: MailOptions) {
    let transporter = nodemailer.createTransport({
        host: enviarMail.host,
        port: enviarMail.port,
        secure: enviarMail.secure,
        auth: enviarMail.auth,
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
            log('Error al mandar mail: ', error);
        }

        // log('Mensaje %s enviado: %s', info.messageId, info.response);
    });
}
