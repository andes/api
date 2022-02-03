import { EventCore } from '@andes/event-bus';
import { Patient } from '@andes/fhir';
import { Engine } from 'json-rules-engine';
import * as mongoose from 'mongoose';
import { services } from '../../services';
import { WebHook } from './webhook.schema';
import { WebHookLog } from './webhooklog/webhooklog.schema';

const request = require('request');

const trasform = {
    fhir: Patient.encode
};


EventCore.on(/.*/, async function (body) {
    const event = this.event;
    const subscriptions = await WebHook.find({
        active: true,
        event
    });

    subscriptions.forEach(async (sub: any) => {

        const valid = await verificarFiltros(sub, body);
        if (!valid) {
            return;
        }

        const bodyTransform = transformBody(sub, body);

        const data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: bodyTransform,
            event
        };

        if (sub.service) {
            await services.get(sub.service).exec(bodyTransform);
        } else {
            request({
                method: sub.method,
                uri: sub.url,
                headers: sub.headers,
                body: data,
                json: true,
                timeout: 10000,
            }, (error, response, _body) => {

                const log = new WebHookLog({
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
        }

    });
});

function transformBody(subscription, body) {
    if (subscription.etl) {
        const _body = toJSON(body);
        return services.transform(_body, subscription.etl);
    } else if (subscription.trasform) {
        return trasform[subscription.trasform](body);
    } else {
        return body;
    }
}

async function verificarFiltros(subscription, body) {
    if (subscription && subscription.rules) {

        const engine = new Engine();

        const _body = JSON.parse(JSON.stringify(body)); // Engine tiene problemas al leer modelos de Mongoose

        engine.addFact('data', _body);

        engine.addRule({
            conditions: subscription.rules,
            event: { type: 'valid' }
        });


        return engine
            .run()
            .then(({ events }) => {
                return events.length > 0;
            });

    } else {
        return true;
    }
}

function toJSON(data) {
    if (data?.toObject) {
        const d = data.toObject();
        return toJSON(d);
    } else if (Array.isArray(data)) {
        return data.map(toJSON);
    } else if (data && typeof data === 'object') {
        Object.keys(data).forEach(k => {
            data[k] = toJSON(data[k]);
        });
        return data;
    } else {
        return data;
    }
}
