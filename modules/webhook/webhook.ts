import { EventCore } from '@andes/event-bus';
import { Patient } from '@andes/fhir';
import { Engine } from 'json-rules-engine';
import * as mongoose from 'mongoose';
import { WebHook } from './webhook.schema';
import { WebHookLog } from './webhooklog/webhooklog.schema';

const request = require('request');

const trasform = {
    fhir: Patient.encode
};

// hack momentaneo hasta corregir librería fhir
async function normalizePatientEvent(event: string, body: any) {

    if ((event === 'mpi:pacientes:create' || event === 'mpi:pacientes:update') && body.relaciones?.length) {
        const plainBody = typeof body.toObject === 'function' ? body.toObject() : body;

        plainBody.relaciones = await Promise.all(plainBody.relaciones.map(async (r: any) => {
            const referencia = r.referencia || {};
            const newRelacion: any = {
                referencia: referencia._id || referencia,
                nombre: referencia.nombre,
                apellido: referencia.apellido,
                documento: referencia.documento || null,
                numeroIdentificacion: referencia.numeroIdentificacion,
                fechaNacimiento: referencia.fechaNacimiento
            };
            return newRelacion;
        }));
        plainBody.genero = plainBody.sexo;

        if (!plainBody.createdBy?.organizacion) {
            plainBody.createdBy = { organizacion: { nombre: '', id: '', _id: '' } };
        }
        return plainBody;
    }
    return body;
}


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
        body = await normalizePatientEvent(sub.event, body);
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

