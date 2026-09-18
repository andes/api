import { PacienteSubSchema } from 'core-v2/mpi/paciente/paciente.schema';
import { model, Schema, Document } from 'mongoose';
import { SnomedConcept } from '../../rup/schemas/snomed-concept';
import * as registro from '../../rup/schemas/prestacion.registro';
import { PrestacionSolicitudHistorialschema } from '../../rup/schemas/prestacion.solicitud.historial';

import { PrestacionEstadoSchema } from '../../rup/schemas/prestacion.estado';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const SolicitudSchema = new Schema({

    // Datos principales del paciente
    paciente: PacienteSubSchema,

    // Fecha de Solicitud
    fecha: {
        type: Date,
        required: true
    },

    // Fecha en la que debería habilitarse la solicitud (para turnos o prestaciones futuras)
    fechaHabilitacion: {
        type: Date,
        required: true
    },

    // Ambito de la prestacion: ambulatorio, internacion, guardia, etc.
    ambitoOrigen: {
        type: String,
        required: false,
        default: 'ambulatorio'
    },

    // Tipo de Prestación a ejecutarse (destino)
    tipoPrestacion: SnomedConcept,

    tipoPrestacionOrigen: SnomedConcept,

    // ID del turno relacionado con esta prestación
    turno: Schema.Types.ObjectId,

    // Registros de la solicitud ... para los planes o prestaciones futuras
    registros: [registro.schema],

    // Organización y profesional que solicita la prestación
    organizacionDestino: {
        id: Schema.Types.ObjectId,
        nombre: String
    },

    organizacionOrigen: {
        id: Schema.Types.ObjectId,
        nombre: String
    },

    profesionalDestino: [{
        id: Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String
    }],

    profesionalOrigen: {
        id: Schema.Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String
    },

    // ID de la Prestación desde la que se generó esta Solicitud
    prestacionOrigen: {
        type: Schema.Types.ObjectId,
        ref: 'prestacion'
    },
    // Historial de la solicitud
    historial: [PrestacionSolicitudHistorialschema],

    // Historia de estado de la prestación
    estados: [PrestacionEstadoSchema],
    estadoActual: PrestacionEstadoSchema,

}, { usePushEach: true } as any);


SolicitudSchema.plugin(AuditPlugin);
SolicitudSchema.index({
    'fecha': 1,
    'tipoPrestacion.conceptId': 1,
    'organizacionOrigen.id': 1,
    'organizacionDestino.id': 1
});

export const Solicitudes = model<Document>('solicitudes', SolicitudSchema, 'solicitudes');