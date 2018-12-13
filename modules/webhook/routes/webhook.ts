import * as mongoose from 'mongoose';
import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { WebHook, WebHookLog } from '../schemas/webhookSchema';
import * as Fhir from '../../../packages/fhir/src/patient';
const request = require('request');
let router = express.Router();

function filterData(filters: any[], data) {
    let i = 0;
    let continua = true;

    while (i < filters.length && continua) {
        let filter = filters[i];
        let op = filter.operation;
        if (op) {
            switch (op) {
                case 'equal': {
                    for (let key in filter.data) {
                        if (!data[key] || JSON.stringify(data[key]) === JSON.stringify(filter.data[key])) {
                            continua = true;
                        } else {
                            continua = false;
                        }
                    }
                    break;
                }
                case 'distinct': {
                    // Es para evitar el procesamiento de un objeto determinado
                    for (let key in filter.data) {
                        if (!data[key] || JSON.stringify(data[key]) === JSON.stringify(filter.data[key])) {
                            continua = false;
                        } else {
                            continua = true;
                        }
                    }
                    break;
                }
                default: {
                    // No se aplica ningún filtrado porque no entró en ninguna condición
                    continua = true;
                    break;
                }
            }
        }
        i++;
    }
    return continua;
}

EventCore.on(/.*/, async function (body) {
    const event = this.event;
    let bodyFhir = null;
    if (event === 'mpi:patient:create' || event === 'mpi:patient:update') {
        bodyFhir = (Object as any).assign({}, Fhir.encode(body));
    }

    let subscriptions = await WebHook.find({
        event
    });
    subscriptions.forEach((sub: any) => {
        if (sub.filters) {
            let respuesta = !filterData(sub.filters, body);
            if (respuesta) {
                return null;
            }
        }
        let data = {
            id: new mongoose.Types.ObjectId(),
            subscription: sub._id,
            data: bodyFhir ? bodyFhir : body,
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
