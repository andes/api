import { pushNotificationsSettings } from '../../../config.private';
const PushNotifications = require('node-pushnotifications');

export interface INotification {
    title?: String;
    body: String;
    extraData?: Object;
    sound?: String;
    badge?: Number;
    icon?: String;
    contentAvailable?: Boolean;
}

export class PushClient {
    private pushServer = null;
    private defaultTitle = 'ANDES';


    constructor() {
        this.pushServer = new PushNotifications(pushNotificationsSettings);
    }

    public send(deviceIds, notification: INotification) {

        return this.pushServer.send(deviceIds, this.notificationToObject(notification));
        // .then((results) => console.log(results))
        // .catch((err) => console.log(JSON.stringify(err)));
    }

    private notificationToObject(notification: INotification) {
        return {
            title: notification.title || this.defaultTitle,
            body: notification.body,
            custom: notification.extraData,
            contentAvailable: notification.contentAvailable == null ? false : notification.contentAvailable,
            badge: notification.badge || undefined,
            sound: notification.sound || undefined,
            icon: notification.icon || '',
            priority: 'high',
            collapseKey: '',
            delayWhileIdle: true,
            restrictedPackageName: '',
            dryRun: false,
            tag: '',
            color: '',
            clickAction: '',
            locKey: '',
            bodyLocArgs: '',
            titleLocKey: '',
            titleLocArgs: '',
            retries: 1,
            encoding: '',
            alert: {},
            launchImage: '',
            action: '',
            topic: '',
            category: '',
            mdm: '',
            urlArgs: '',
            truncateAtWordEnd: true,
            mutableContent: 0,
            timeToLive: 28 * 86400, // if both expiry and timeToLive are given, expiry will take precedency
        };
    }

    /*
    // Example Data
    private dataExample = {
        title: 'New push notification', // REQUIRED
        body: 'Powered by AppFeel', // REQUIRED
        custom: {
            sender: 'AppFeel',
        },
        priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
        collapseKey: '', // gcm for android, used as collapseId in apn
        contentAvailable: true, // gcm for android
        delayWhileIdle: true, // gcm for android
        restrictedPackageName: '', // gcm for android
        dryRun: false, // gcm for android
        icon: '', // gcm for android
        tag: '', // gcm for android
        color: '', // gcm for android
        clickAction: '', // gcm for android. In ios, category will be used if not supplied
        locKey: '', // gcm, apn
        bodyLocArgs: '', // gcm, apn
        titleLocKey: '', // gcm, apn
        titleLocArgs: '', // gcm, apn
        retries: 1, // gcm, apn
        encoding: '', // apn
        badge: 2, // gcm for ios, apn
        sound: 'ping.aiff', // gcm, apn
        alert: {}, // apn, will take precedence over title and body
        // alert: '', // It is also accepted a text message in alert
        titleLocKey: '', // apn and gcm for ios
        titleLocArgs: '', // apn and gcm for ios
        launchImage: '', // apn and gcm for ios
        action: '', // apn and gcm for ios
        topic: '', // apn and gcm for ios
        category: '', // apn and gcm for ios
        contentAvailable: '', // apn and gcm for ios
        mdm: '', // apn and gcm for ios
        urlArgs: '', // apn and gcm for ios
        truncateAtWordEnd: true, // apn and gcm for ios
        mutableContent: 0, // apn
        expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
        timeToLive: 28 * 86400, // if both expiry and timeToLive are given, expiry will take precedency
        headers: [], // wns
        launch: '', // wns
        duration: '', // wns
        consolidationKey: 'my notification', // ADM
    };
    */

}

