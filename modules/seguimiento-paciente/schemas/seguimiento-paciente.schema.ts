import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Document, model, Schema, Types } from 'mongoose';
import { ISeguimientoPaciente } from '../interfaces/seguimiento-paciente.interface';
import { contactoEstrechoSchema } from './contacto-estrecho.schema';

export const seguimientoPacienteSchema = new Schema(
    {
        fechaInicio: {
            type: Date,
            default: Date.now(),
        },
        origen: {     // El origen podría ser: Una ficha, fuente de datos externa, etc.
            id: Types.ObjectId,
            nombre: String,
            tipo: String  // autoseguimiento, seguimiento externo, etc.
        },
        score: {
            value: Number,
            fecha: Date
        },
        paciente: {
            id: Types.ObjectId,
            nombre: String,
            apellido: String,
            documento: String,
            telefonoActual: String,
            direccionActual: String,
            sexo: String,
            foto: String,
            fechaNacimiento: Date
        },
        llamados: [
            {
                fechaLlamado: Date,
                idPrestacion: Types.ObjectId,
                profesional: {
                    id: Types.ObjectId,
                    nombre: String,
                    apellido: String
                },
                organizacion: {
                    id: Types.ObjectId,
                    nombre: String
                },
            }
        ],
        ultimoEstado: {
            clave: String,
            valor: Date
        },
        contactosEstrechos: [contactoEstrechoSchema]
    });

seguimientoPacienteSchema.plugin(AuditPlugin);
export const SeguimientoPaciente = model<Document & ISeguimientoPaciente>('seguimientoPaciente', seguimientoPacienteSchema, 'seguimientoPacientes');
