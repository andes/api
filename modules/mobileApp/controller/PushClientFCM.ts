import * as request from 'request';
import { pushNotificationsSettings } from './../../../config.private';

export async function sendPushNotification(token, notification: any) {
    return new Promise((resolve, reject) => {
        const payload = {
            notification: {
                title: notification.title || 'Andes Salud',
                body: notification.body,
                sound: 'default',
                icon: 'fcm_push_icon',
            },
            data: {
                extraData: notification.extraData
            },
            to: token,
            priority: 'high',
            restricted_package_name: '',
            time_to_live: 0,
        };


        request('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `key=${pushNotificationsSettings.gcm.id}`,
            },
            body: JSON.stringify(payload)
        }, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            return resolve([response, body])
        });
    })

}
