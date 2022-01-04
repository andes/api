import { MongooseAuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { schema as cie10Schema } from '../../../core/term/schemas/cie10';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { ObraSocialSchema } from '../../obraSocial/schemas/obraSocial';
import { SnomedConcept } from './snomed-concept';

const pacienteSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    apellido: String,
    alias: String,
    documento: String,
    fechaNacimiento: Date,
    telefono: String,
    sexo: String,
    carpetaEfectores: [{
        organizacion: String,
        nroCarpeta: String
    }],
    obraSocial: { type: ObraSocialSchema }
});

export const CodificacionSchema = new mongoose.Schema({
    idPrestacion: {
        type: mongoose.Schema.Types.ObjectId
    },
    idProfesional:{
        type: mongoose.Schema.Types.ObjectId
    },
    tipoPrestacion: tipoPrestacionSchema,
    paciente: pacienteSchema,
    ambitoPrestacion: {
        type: String,
        required: false,
        default: 'ambulatorio'
    },
    diagnostico: {
        codificaciones: [{
            // (ver schema) solamente obtenida de RUP o SIPS y definida por el profesional
            codificacionProfesional: {
                cie10: cie10Schema,
                snomed: SnomedConcept
            },
            // (ver schema) corresponde a la codificación establecida la instancia de revisión de agendas
            codificacionAuditoria: cie10Schema,
            primeraVez: Boolean,
        }]
    },
    // estadoFacturacion: IEstadoFacturacion,
    estadoFacturacion: {
        tipo: String,
        estado: String,
        numeroComprobante: String
    },
});

CodificacionSchema.index({
    createdAt: 1,
    'createdBy.organizacion.id': 1
});

CodificacionSchema.index({
    createdAt: 1,
    ambitoPrestacion: 1,
    'createdBy.organizacion.id': 1
});

CodificacionSchema.index({
    updatedAt: 1,
    ambitoPrestacion: 1,
    'createdBy.organizacion.id': 1
});

CodificacionSchema.index({
    idPrestacion: 1
});

CodificacionSchema.plugin(
    MongooseAuditPlugin(true)
);
export const Codificacion = mongoose.model('codificacion', CodificacionSchema, 'codificacion');

