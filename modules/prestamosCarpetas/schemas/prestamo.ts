import { tipoPrestacionSchema, ITipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { espacioFisicoSchema, IEspacioFisico } from '../../../modules/turnos/schemas/espacioFisico';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as constantes from './constantes';
import { Document, Schema, Types, SchemaTypes, model, Model } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export interface IPrestamo extends Document {
    paciente: any;
    numero: String;
    organizacion: { nombre: String; };
    estado: String;
    datosPrestamo: {
        observaciones: String;
        agendaId: Types.ObjectId;
        turno: {
            id: Types.ObjectId;
            profesionales: [{ nombre: String; apellido: String; }];
            tipoPrestacion: ITipoPrestacion;
            espacioFisico: IEspacioFisico;
        }
    };
    datosDevolucion: {
        observaciones: String,
        estado: {
            type: String,
            enum: ['Normal', 'En mal estado', 'Fuera de término', 'Hojas o documentación faltante']
        }
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
    paciente: {
        type: {
            id: SchemaTypes.ObjectId,
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
            }]
        }
    },
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
            profesionales: [nombreApellidoSchema],
            tipoPrestacion: tipoPrestacionSchema,
            espacioFisico: espacioFisicoSchema
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
        espacioFisico: espacioFisicoSchema,
        prestacion: tipoPrestacionSchema,
        profesional: nombreApellidoSchema,
        responsable: nombreApellidoSchema,
        observaciones: String,
        idSolicitud: SchemaTypes.ObjectId
    }
});

PrestamoSchema.plugin(AuditPlugin);

// Exportar modelo
export const Prestamo: Model<IPrestamo> = model<IPrestamo>('prestamos', PrestamoSchema, 'prestamos');

