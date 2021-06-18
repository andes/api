
import * as fs from 'fs';
import moment = require('moment');
import { services } from '../../services';
const handlebars = require('handlebars');
const path = require('path');

handlebars.registerHelper('datetime', dateTime => {
    return moment(dateTime).format('D MMM YYYY [a las] H:mm [hs]');
});

export interface MailOptions {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html: string;
    attachments?: any;
}

export async function sendMail(options: MailOptions, servicioAlternativo: string = null) {
    const servicio = servicioAlternativo || 'email-send-default';
    return services.get(servicio).exec(options);
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
                const template = handlebars.compile(html);
                const htmlToSend = template(extras);
                return resolve(htmlToSend);
            } catch (exp) {
                return reject(exp);
            }

        });
    });
}

export function registerPartialTemplate(key: string, fileName: string) {
    const filePath = path.join(process.cwd(), `templates/${fileName}`);
    const file = fs.readFileSync(filePath);
    handlebars.registerPartial(key, file.toString());
}
