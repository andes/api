import { Schema, model, Document } from 'mongoose';
import ISeguimientoPaciente from './seguimientoPaciente.interface';
import * as registro from '../../rup/schemas/prestacion.registro';
import { profesionalSchema } from '../../../core/tm/schemas/profesional';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const seguimientoPacienteSchema = new Schema(
    {
        paciente: {
            id: Schema.Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String,
            sexo: String,
            fechaNacimiento: Date,
        },
        profesional: profesionalSchema,
        registro,
        fechaDiagnostico: {
            type: Date,
            default: Date.now(),
        }
    },
    {
        versionKey: false
    }
);

seguimientoPacienteSchema.plugin(AuditPlugin);

export const SeguimientoPaciente = model<Document & ISeguimientoPaciente>('seguimientoPaciente', seguimientoPacienteSchema, 'seguimientoPacientes');
