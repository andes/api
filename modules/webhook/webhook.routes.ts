import { WebHook } from './webhook.schema';
import { Auth } from '../../auth/auth.class';
import { MongoQuery, ResourceBase } from '@andes/core';
import { findOrCreate } from '../../core-v2/mpi/paciente/paciente.controller';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import { PatientNotFound } from '../../core-v2/mpi/paciente/paciente.error';
import { asyncHandler } from '@andes/api-tool';
import * as moment from 'moment';
import { EventCore } from '@andes/event-bus/';

class WebhookResource extends ResourceBase {
    Model = WebHook;
    resourceName = 'webhook';
    keyId = '_id';
    searchFileds = {
        nombre: MongoQuery.partialString,
        search: ['nombre']
    };
}

export const WebhookCtr = new WebhookResource({});
export const WebhookRouter = WebhookCtr.makeRoutes();

WebhookRouter.post('/notification', Auth.authenticate(), asyncHandler(async (req: Request, res) => {
    const query: any = req.body;
    // Fecha utilizada por el SIL
    query.fechaNacimiento = moment(query.fechaNacimiento, 'DD/MM/YYYY').startOf('day').toDate() || null;
    if (query.documento) {
        const paciente = await findOrCreate(query, req);
        // Verifica los datos de contacto
        if (query.telefono) {
            let contactos = [];
            if (paciente.contacto && paciente.contacto.length >= 0) {
                contactos = paciente.contacto.filter(c => c && c.valor && (c.valor === query.telefono));
            }
            if (contactos.length === 0) {
                const nuevoContacto = {
                    activo: true,
                    tipo: 'celular',
                    valor: query.telefono,
                    ranking: 0,
                    ultimaActualizacion: new Date()
                };
                contactos.push(nuevoContacto);
                paciente.contacto = contactos;
            }
            EventCore.emitAsync('notification:patient:laboratory', paciente);
            await PacienteCtr.update(paciente.id, paciente, req as any);
        }
        return res.json(paciente);
    }
    return res.json(new PatientNotFound());
}));
