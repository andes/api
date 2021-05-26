import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase } from '@andes/core';
import { EventCore } from '@andes/event-bus/';
import * as moment from 'moment';
import { Auth } from '../../auth/auth.class';
import { findOrCreate, getLocalidad } from '../../core-v2/mpi/paciente/paciente.controller';
import { PatientNotFound } from '../../core-v2/mpi/paciente/paciente.error';
import { PacienteCtr } from '../../core-v2/mpi/paciente/paciente.routes';
import { getZona } from '../../core/tm/controller/localidad';
import { WebHook } from './webhook.schema';

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
            // filtrar zonas que no reciben notificaciones
            let enviarNotificacion = true;
            const localidadPaciente: any = getLocalidad(paciente);
            const Zona = localidadPaciente && await getZona(localidadPaciente._id);
            if (Zona) {
                enviarNotificacion = Zona.configuracion.notificaciones;
            }
            if (enviarNotificacion) {
                EventCore.emitAsync('notification:patient:laboratory', paciente);
            }

            await PacienteCtr.update(paciente.id, paciente, req as any);
            const data = {
                paciente,
                protocolo: query.protocolo ? query.protocolo : null,
                resultado: query.resultado ? query.resultado : null
            };
            /* Nueva información que viene desde el laboratorio:
                1) Nos permitirá dar resultado por sms (cuando den el ok).
                2) Nos permite actualizar la información de PCR automáticamente en la ficha
            */
            if (data.resultado) {
                EventCore.emitAsync('notification:fichaEpidemiologica:laboratory', data);
            }
        }
        return res.json(paciente);
    }
    return res.json(new PatientNotFound());
}));
