import { RoboModel } from './roboSchema';

export interface ISms {
    phone: string;
    message: string;
}


/**
 * Interface Email-send
 * @param {string} email E-mail de destino.
 * @param {string} subject Titulo del e-mail.
 * @param {string} template Nombre del templete de email para generar el html. Archivos en la carpeta /templates
 * @param {object} extras Datos exxtras para rendedirar el HTML.
 * @param {string} plainText Texto base del email, sin etiquetas HTML.
 */
export interface IEmail {
    email: string;
    subject: string;
    template: string;
    extras: any;
    plainText: string;
}

export function sendSms(data: ISms, options: any = {}) {
    const obj = new RoboModel({
        message: data.message,
        phone: data.phone,
        from: options.from ? options.from : 'undefined',
        email: null,

        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: options.scheduledAt ? options.scheduledAt : new Date(),
        tries: 0,
    });

    return obj.save();
}

export function sendEmail(data: IEmail, options: any = {}) {
    const obj = new RoboModel({
        message: data.plainText,
        phone: null,

        email: data.email,
        template: data.template,
        extras: data.extras,
        subject: data.subject,

        from: options.from ? options.from : 'undefined',

        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: options.scheduledAt ? options.scheduledAt : new Date(),
        tries: 0,
    });

    return obj.save();
}

export function removeSend(id) {
    return new Promise((resolve, reject) => {
        RoboModel.findById(id, (err, doc: any) => {
            if (doc) {
                doc.status = 'canceled';
                doc.updatedAt = new Date();
                doc.save((_err) => {
                    if (_err) {
                        return reject(err);
                    }
                    return resolve();
                });
            }
            return reject();
        });
    });
}

export function sendNotification(data: ISms, devices, options: any = {}) {
    const obj = new RoboModel({
        message: data.message,
        device_id: devices.map(item => item.device_id),
        from: options.from ? options.from : 'undefined',
        email: null,

        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: options.scheduledAt ? options.scheduledAt : new Date(),
        tries: 0,
    });
    return obj.save();
}
