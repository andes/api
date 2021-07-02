import * as debug from 'debug';
import { createFile } from '../../modules/huds/export-huds/exportHuds.controller';
import { PushClient } from '../../modules/mobileApp/controller/PushClient';
import { services } from '../../services';
import { RoboModel } from './roboSchema';
import * as mailTools from './sendEmail';
import * as smsTools from './sendSms';
import { sendPushNotification } from '../../modules/mobileApp/controller/PushClientFCM';

const log = debug('roboSender');

export function roboSender() {
    log('Running roboSender');
    return new Promise((resolve, reject) => {

        const condition = {
            status: 'pending',
            scheduledAt: { $lte: new Date() }
        };

        let counter = 0;

        RoboModel.find(condition).then(async (enviosPendientes: any[]) => {
            log('Encuentro ', enviosPendientes.length, 'mensajes para enviar');
            if (enviosPendientes.length > 0) {
                for (const env of enviosPendientes) {
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
                            new PushClient().send(env.device_id, env.notificationData);
                        }

                        if (env.device_fcm_token) {
                            const device = [
                                { device_fcm_token: env.device_fcm_token }
                            ];
                            await sendPushNotification(device, env.notificationData);
                        }

                        // Exportar HUDS
                        if (env.idExportHuds) {
                            await createFile(env.idExportHuds);
                        }

                        if (env.service) {
                            await services.get(env.service).exec(env.params);
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
                    if (finEjecucion(counter, enviosPendientes.length)) {
                        return resolve(true);
                    }
                }
            } else {
                log('Termina la ejecución');
                return resolve(true);
            }

        }).catch((err) => {
            log('Termina la ejecución', err);
            return reject();
        });

    });
}


async function changeState(env, newState) {
    env.status = newState;
    env.tries += 1;
    env.updatedAt = new Date();
    await env.save();
}

function finEjecucion(counter, enviosPendientes) {
    if (counter === enviosPendientes) {
        return true;
    } else {
        return false;
    }

}
