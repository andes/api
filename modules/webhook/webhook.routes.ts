import { WebHook } from './webhook.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { findOrCreate } from '../../core-v2/mpi/paciente/paciente.controller';
import { PatientNotFound } from '../../core-v2/mpi/paciente/paciente.error';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import * as moment from 'moment';

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

WebhookRouter.post('/notification', Auth.authenticate(), async (req, res, next) => {
    if (!Auth.check(req, 'cda:paciente')) {
        return next(403);
    }
    try {
        const query: any = req.body;
        // Fecha utilizada por el SIL
        query.fechaNacimiento = moment(query.fechaNacimiento, 'DD/MM/YYYY').format('YYYY-MM-DD') || null;
        if (query.documento) {
            const paciente = await findOrCreate(query, req);
            // Verifica los datos de contacto
            if (query.telefono) {
                const contacto = paciente.contacto.filter(c => c && c.valor && (c.valor === query.telefono));
                if (!contacto) {
                    const nuevoContacto = {
                        activo: true,
                        tipo: 'celular',
                        valor: query.telefono,
                        ranking: 0,
                        ultimaActualizacion: new Date()
                    };
                    paciente.contacto.push(nuevoContacto);
                    PacienteCtr.update(paciente.id, paciente, req);
                }
            }
            return res.json(paciente);
        }
        return res.json({});
    } catch (err) {
        return next(err);
    }
});
