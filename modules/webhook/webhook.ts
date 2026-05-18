import { EventCore } from '@andes/event-bus';
import { Patient } from '@andes/fhir';
import { Engine } from 'json-rules-engine';
import * as mongoose from 'mongoose';
import { WebHook } from './webhook.schema';
import { WebHookLog } from './webhooklog/webhooklog.schema';
import { Paciente } from '../../core-v2/mpi';

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

        const bodyTransform = trasform[sub.trasform] ? trasform[sub.trasform](body) : body;

        const data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: bodyTransform,
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

    });
});

async function verificarFiltros(subscription, body) {
    if (subscription && subscription.rules) {

        const engine = new Engine();

        const _body = JSON.parse(JSON.stringify(body)); // Engine tiene problemas al leer modelos de Mongoose

        engine.addFact('data', async (params) => {
            const object = params.requiredObject;
            const path = params.path;

            if (object === 'paciente') {
                const pac = await Paciente.findById(_body[path].id);
                _body[path] = pac.toObject();
            }
            return _body;
        }, { cache: false });

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

