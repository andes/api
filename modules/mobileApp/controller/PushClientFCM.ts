import { services } from '../../../services';
export interface IPushNotification {
    title?: 'Andes Salud' | string;
    body: string;
    extraData?: any;
}

export function sendPushNotification(token, notification: IPushNotification) {
    const payload = {
        title: notification.title || 'Andes Salud',
        body: notification.body,
        extraData: notification.extraData,
        to: token,
        priority: 'high',
        restricted_package_name: '',
        time_to_live: 0,
    };

    const servicio = 'push-notifications-default';
    return services.get(servicio).exec(payload);

}