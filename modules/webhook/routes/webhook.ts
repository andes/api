import * as mongoose from 'mongoose';
import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { WebHook, WebHookLog } from '../schemas/webhookSchema';

const request = require('request');

let router = express.Router();

function filterData(filter: any[], data) {
    for (let key in filter) {
        if (!data[key] || JSON.stringify(data[key]) === JSON.stringify(filter[key])) {
            // Si entra por esta condición se termina con la ejecución del evento.
            return false;
        }
    }
    return true;
}

EventCore.on(/.*/, async function (body) {
    const event = this.event;
    let subscriptions = await WebHook.find({
        event
    });

    subscriptions.forEach((sub: any) => {
        if (!filterData(sub.filter, body)) {
            return null;
        }
        let data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: body,
            event
        };
        request({
            method: sub.method,
            uri: sub.url,
            headers: sub.headers,
            body: data,
            json: true,
            timeout: 10000,
        }, (error, response, _body) => {

            let log = new WebHookLog({
                event,
                url: sub.url,
                method: sub.method,
                headers: sub.headers,
                body: data,
                subscriptionId: sub._id,
                status: error ? 0 : response.statusCode,
                response: _body
            });
            log.save();
        });

    });
});
export = router;
