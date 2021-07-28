import { services } from '../../../services';
export interface IPushNotification {
    title?: 'Andes Salud' | string;
    body: string;
    extraData?: any;
}

export function sendPushNotification(devices, notification: IPushNotification): any {

    const servicio = 'push-notifications-default';

    for (const device of devices) {
        if (device.device_fcm_token) {
            const payload = {
                title: notification.title || 'Andes Salud',
                body: notification.body,
                extraData: notification.extraData,
                to: device.device_fcm_token,
                priority: 'high',
                restricted_package_name: '',
                time_to_live: 0,
            };

            // Enviar push con llamada HTTP
            services.get(servicio).exec(payload);
        }
    }

}
