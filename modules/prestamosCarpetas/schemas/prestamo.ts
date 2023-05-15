import { tipoPrestacionSchema, ITipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { EspacioFisicoSchema, IEspacioFisico } from '../../../modules/turnos/schemas/espacioFisico';
import { NombreApellidoSchema } from '../../../core/tm/schemas/nombreApellido';
import * as constantes from './constantes';
import { Document, Schema, Types, SchemaTypes, model, Model } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

export interface IPrestamo extends Document {
    paciente: any;
    numero: String;
    organizacion: { nombre: String };
    estado: String;
    datosPrestamo: {
        observaciones: String;
        agendaId: Types.ObjectId;
        turno: {
            id: Types.ObjectId;
            profesionales: [{ nombre: String; apellido: String }];
            tipoPrestacion: ITipoPrestacion;
            espacioFisico: IEspacioFisico;
        };
    };
    datosDevolucion: {
        observaciones: String;
        estado: {
            type: String;
            enum: ['Normal', 'En mal estado', 'Fuera de término', 'Hojas o documentación faltante'];
        };
    };
    datosSolicitudManual: {
        espacioFisico: IEspacioFisico;
        prestacion: ITipoPrestacion;
        profesional: { nombre: String; apellido: String };
        responsable: { nombre: String; apellido: String };
        observaciones: String;
        idSolicitud: Types.ObjectId;
    };
}

export const PrestamoSchema = new Schema({
    paciente: PacienteSubSchema,
    numero: String,
    organizacion: {
        type: nombreSchema,
        required: true
    },
    estado: {
        type: String,
        enum: [constantes.EstadosPrestamosCarpeta.EnArchivo, constantes.EstadosPrestamosCarpeta.Prestada],
        default: constantes.EstadosPrestamosCarpeta.EnArchivo
    },
    datosPrestamo: {
        observaciones: String,
        agendaId: SchemaTypes.ObjectId,
        turno: {
            id: SchemaTypes.ObjectId,
            profesionales: [NombreApellidoSchema],
            tipoPrestacion: tipoPrestacionSchema,
            espacioFisico: EspacioFisicoSchema
        }
    },
    datosDevolucion: {
        observaciones: String,
        estado: {
            type: String,
            enum: ['Normal', 'En mal estado', 'Fuera de término', 'Hojas o documentación faltante']
        }
    },
    datosSolicitudManual: {
        espacioFisico: EspacioFisicoSchema,
        prestacion: tipoPrestacionSchema,
        profesional: NombreApellidoSchema,
        responsable: NombreApellidoSchema,
        observaciones: String,
        idSolicitud: SchemaTypes.ObjectId
    }
});

PrestamoSchema.plugin(AuditPlugin);

PrestamoSchema.index({
    'organizacion._id': 1,
    numero: 1,
    createdAt: -1
});

// Exportar modelo
export const Prestamo: Model<IPrestamo> = model<IPrestamo>('prestamos', PrestamoSchema, 'prestamos');

