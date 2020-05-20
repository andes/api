import * as configPrivate from '../../config.private';
import * as mailTools from './sendEmail';
import * as smsTools from './sendSms';
import { RoboModel } from './roboSchema';

import * as debug from 'debug';
import { PushClient } from '../../modules/mobileApp/controller/PushClient';
const log = debug('roboSender');

export function roboSender() {
    log('Running roboSender');
    return new Promise((resolve, reject) => {

        const condition = {
            status: 'pending',
            scheduledAt: { $lte: new Date() }
        };

        let counter = 0;

        RoboModel.find(condition).then((enviosPendientes: any[]) => {
            log('Encuentro ', enviosPendientes.length, 'mensajes para enviar');
            if (enviosPendientes.length > 0) {
                enviosPendientes.forEach(async env => {
                    try {
                        if (env.email) {
                            let html = '';

                            /**
                             * Renderizamo con handlebars el template elegido
                             */
                            if (env.template && env.template.length) {
                                html = await mailTools.renderHTML(env.template, env.extras);
                            } else {
                                html = env.message;
                            }

                            const mailOptions: mailTools.MailOptions = {
                                from: configPrivate.enviarMail.host,
                                to: env.email,
                                subject: env.subject,
                                text: env.message,
                                html,
                                attachments: ''
                            };
                            log('Enviando email a', env.email);
                            await mailTools.sendMail(mailOptions);
                        }

                        if (env.phone) {
                            const smsOptions: smsTools.SmsOptions = {
                                telefono: env.phone,
                                mensaje: env.message
                            };
                            log('Enviando SMS a', env.phone);
                            await smsTools.sendSms(smsOptions);
                        }
                        if (env.device_id) {
                            const notification = {
                                body: env.message
                            };
                            new PushClient().send(env.device_id, notification);
                        }

                        await changeState(env, 'success');

                    } catch (errorSending) {
                        log('Error enviando mensaje');
                        if (env.tries > 5) {
                            await changeState(env, 'error');
                        } else {
                            await changeState(env, 'pending');
                        }
                    }
                    counter++;
                    if (counter === enviosPendientes.length) {
                        log('Termina la ejecución');
                        return resolve();
                    }
                });
            } else {
                log('Termina la ejecución');
                return resolve();
            }

        }).catch((err) => {
            log('Termina la ejecución', err);
            return reject();
        });
    });
}


function changeState(env, newState) {
    return new Promise((resolve, reject) => {

        env.status = newState;
        env.tries += 1;
        env.updatedAt = new Date();

        env.save((err, datos) => {
            if (err) {
                return reject();
            }
            return resolve();
        });
    });
}
