import * as mongoose from 'mongoose';
import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { WebHook, WebHookLog } from '../schemas/webhookSchema';

const request = require('request');

let router = express.Router();

function filterData(filters: any[], data) {
    filters.forEach(filter => {
        let op = filter.operation;
        let band = false;
        if (op) {
            switch (op) {
                case 'equal': {
                    for (let key in filter.data) {
                        if (!data[key] || JSON.stringify(data[key]) === JSON.stringify(filter[key])) {
                            band = true;
                        }
                    }
                    break;
                }
                // case 'distinct': {
                //     for (let key in filter.data) {
                //         if (!data[key] || JSON.stringify(data[key]) === JSON.stringify(filter[key])) {
                //             band = false;
                //         }
                //     }
                //     break;
                // }
                default: {
                    // No se aplica ningún filtrado porque no entró en ninguna condición
                    band = true;
                    break;
                }
            }
        }
        return band;
    });
    // No se aplica el filtrado si no hay elementos en el array de filters
    return true;
}

EventCore.on(/.*/, async function (body) {
    const event = this.event;
    let subscriptions = await WebHook.find({
        event
    });

    subscriptions.forEach((sub: any) => {
        if (!filterData(sub.filters, body)) {
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
