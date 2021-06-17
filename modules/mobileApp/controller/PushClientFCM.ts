import fetch from 'node-fetch';
import { pushNotificationsSettings } from './../../../config.private';

export async function sendPushNotification(token, notification: any) {

    const payload = {
        notification: {
            title: notification.title || 'Lala',
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

    return await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${pushNotificationsSettings.gcm.id}`,
        },
        body: JSON.stringify(payload)
    });

}