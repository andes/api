import { Schema, Model, model, Document } from 'mongoose';
import { NombreApellidoSchema } from '../../../core/tm/schemas/nombreApellido';
import { PacienteSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
import { tipoPrestacionSchema, ITipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { EspacioFisicoSchema, IEspacioFisico } from '../../../modules/turnos/schemas/espacioFisico';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as constantes from './constantes';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

// [TODO] acomodar los schemas nombreApellido y nombreSchema
// [TODO] implementar interface paciente
export interface ISolicitudManual extends Document {
    fecha: Date;
    numero: String;
    estado: String;
    paciente: any;
    organizacion: {
        nombre: String;
    };

    datosSolicitudManual: {
        espacioFisico: IEspacioFisico;
        prestacion: ITipoPrestacion;
        profesional: { nombre: String; apellido: String };
        responsable: { nombre: String; apellido: String };
        observaciones: String;
    };
}

export const SolicitudCarpetaManualSchema = new Schema({
    fecha: Date,
    paciente: PacienteSchema,
    numero: String,
    estado: {
        type: String,
        enum: [constantes.EstadoSolicitudCarpeta.Pendiente, constantes.EstadoSolicitudCarpeta.Aprobada],
        default: constantes.EstadoSolicitudCarpeta.Pendiente
    },
    organizacion: {
        type: nombreSchema,
        required: true
    },
    datosSolicitudManual: {
        espacioFisico: EspacioFisicoSchema,
        prestacion: tipoPrestacionSchema,
        profesional: NombreApellidoSchema,
        responsable: NombreApellidoSchema,
        observaciones: String
    }
});

SolicitudCarpetaManualSchema.plugin(AuditPlugin);

export const SolicitudCarpetaManual: Model<ISolicitudManual> = model<ISolicitudManual>('solicitudCarpetaManual', SolicitudCarpetaManualSchema, 'solicitudCarpetaManual');

