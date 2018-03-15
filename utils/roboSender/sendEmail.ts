import { enviarMail } from '../../config.private';
import * as debug from 'debug';
import * as fs from 'fs';
let handlebars = require('handlebars');
const path = require('path');
const nodemailer = require('nodemailer');
let log = debug('sendMail');

export interface MailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
}

export function sendMail(options: MailOptions) {
    return new Promise((resolve, reject) => {
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
                return reject(error);
            }
            return resolve(info);
        });
    });
}

export function renderHTML(templateName: string, extras: any): Promise<string> {
    return new Promise((resolve, reject) => {
        // [TODO] Analizar el path relativo o absoluto
        const TEMPLATE_PATH = './templates/';
        const url = path.join(TEMPLATE_PATH, templateName);
        fs.readFile(url, { encoding: 'utf-8' }, (err, html) => {
            if (err) {
                return reject(err);
            }
            try {
                let template = handlebars.compile(html);
                let htmlToSend = template(extras);
                return resolve(htmlToSend);
            } catch (exp) {
                return reject(exp);
            }

        });
    });
}
