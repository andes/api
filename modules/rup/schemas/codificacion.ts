import * as mongoose from 'mongoose';
import { schema as cie10Schema } from '../../../core/term/schemas/cie10';
import { SnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ObraSocialSchema } from '../../obraSocial/schemas/obraSocial';

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

const codificacionSchema = new mongoose.Schema({
    idPrestacion: {
        type: mongoose.Schema.Types.ObjectId
    },
    paciente: pacienteSchema,
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
codificacionSchema.plugin(AuditPlugin);
let codificacion = mongoose.model('codificacion', codificacionSchema, 'codificacion');
export = codificacion;
