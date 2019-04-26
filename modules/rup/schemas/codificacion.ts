import * as mongoose from 'mongoose';
import * as cie10 from '../../../core/term/schemas/cie10';
import { SnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as obraSocialSchema from '../../obraSocial/schemas/obraSocial';
import * as IEstadoFacturacion from '../../facturacionAutomatica/schemas/estadoFacturacion';

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
        organizacion: nombreSchema,
        nroCarpeta: String
    }],
    obraSocial: { type: obraSocialSchema }
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
                cie10: cie10.schema,
                snomed: SnomedConcept
            },
            // (ver schema) corresponde a la codificación establecida la instancia de revisión de agendas
            codificacionAuditoria: cie10.schema,
            primeraVez: Boolean,
        }]
    },
    estadoFacturacion: IEstadoFacturacion
});
codificacionSchema.plugin(AuditPlugin);
let codificacion = mongoose.model('codificacion', codificacionSchema, 'codificacion');
export = codificacion;
