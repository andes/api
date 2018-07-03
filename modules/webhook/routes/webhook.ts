import * as mongoose from 'mongoose';
import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { WebHook, WebHookLog } from '../schemas/webhookSchema';

const request = require('request');

let router = express.Router();

EventCore.on(/.*/, async function (body) {
    const event = this.event;

    let subscriptions = await WebHook.find({ event });

    subscriptions.forEach ((sub: any) => {

        let data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: body,
            event: event
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
                event: event,
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
