import * as configPrivate from '../../config.private';

import * as mailTools from './sendEmail';
import * as smsTools from './sendSms';
import { roboModel } from './roboSchema';


export function roboSender() {
    return new Promise((resolve, reject) => {

        let condition = {
            status: 'pending',
            scheduledAt: { $lte: new Date()  }
        };

        let counter = 0;

        roboModel.find(condition).then((enviosPendientes: any[]) => {

            if (enviosPendientes.length > 0) {
                enviosPendientes.forEach(async env => {
                    try {
                        if (env.email) {
                            let html = '';
                            if (env.template && env.template.length) {
                                html = await mailTools.renderHTML(env.template, env.extras);
                            } else {
                                html = env.message;
                            }

                            let mailOptions: mailTools.MailOptions = {
                                from: configPrivate.enviarMail.host,
                                to: env.email,
                                subject: env.subject,
                                text: env.message,
                                html: html
                            };
                            await mailTools.sendMail(mailOptions);
                        }

                        if (env.phone) {
                            let smsOptions: smsTools.SmsOptions = {
                                telefono: env.phone,
                                mensaje: env.message
                            };
                            await smsTools.sendSms(smsOptions);
                        }

                        await changeState(env, 'success');

                    } catch (errorSending) {
                        if (env.tries > 5) {
                            await changeState(env, 'error');
                        } else {
                            await changeState(env, 'pending');
                        }
                    }
                    counter++;
                    if (counter === enviosPendientes.length) {
                        resolve();
                    }
                });
            } else {
                resolve();
                // db.close();
                // console.log('Proceso finalizado, nada para enviar: ', Date.now());
            }

        }).catch((err) => {
            reject();
        });
    });
}


function changeState(env, newState) {
    return new Promise((resolve, reject) => {

        env.status = newState;
        env.tries += 1;
        env.updatedAt = new Date();

        env.save(function (err, datos) {
            if (err) {
                return reject();
            }
            return resolve();
        });
    });
}
