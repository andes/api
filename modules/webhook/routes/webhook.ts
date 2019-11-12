import * as mongoose from 'mongoose';
import * as express from 'express';
import { EventCore } from '@andes/event-bus';
import { WebHook, WebHookLog } from '../schemas/webhookSchema';
import { Patient } from '@andes/fhir';
import * as webhookController from '../controllers/webhookController';
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

router.get('/webhooks', async (req: any, res, next) => {
    try {
        let data = await WebHook.find({});
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.get('/webhooks/:nombre', async (req: any, res, next) => {
    try {
        let data = await WebHook.find({
            $or: [{ name: { $regex: req.params.nombre, $options: 'i' } },
            { nombre: { $regex: req.params.nombre, $options: 'i' } }]
        });
        res.json(data);
    } catch (error) {
        return next(error);
    }
});

router.post('/webhooks', async (req, res, next) => {
    try {
        req.body.method = req.body.method.nombre;
        let n = await WebHook.insertMany(req.body);
        res.json(n);
    } catch (error) {
        return next(error);
    }
});

router.patch('/webhooks/:id', async (req, res, next) => {
    const id = req.params.id;
    const body = req.body;
    req.body.method = req.body.method.nombre;
    const hook = await webhookController.update(id, body, req);
    if (hook) {
        return res.json(hook);
    } else {
        return next(422);
    }
});

router.delete('/webhooks/:id', async (req, res, next) => {
    const id = req.params.id;
    const plantilla = await webhookController.remove(id);
    if (plantilla) {
        return res.json(plantilla);
    } else {
        return next(422);
    }
});

const trasform = {
    fhir: Patient.encode
};

EventCore.on(/.*/, async function (body) {
    const event = this.event;
    const subscriptions = await WebHook.find({
        active: true,
        event
    });
    subscriptions.forEach((sub: any) => {
        const bodyTransform = trasform[sub.trasform] ? trasform[sub.trasform](body) : body;

        if (sub.filters) {
            const respuesta = !filterData(sub.filters, bodyTransform);
            if (respuesta) {
                return null;
            }
        }
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
