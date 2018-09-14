import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { espacioFisicoSchema } from '../../../modules/turnos/schemas/espacioFisico';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as constantes from './constantes';
import { Document, Schema, SchemaTypes, model, Model } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export interface IPrestamo extends Document {

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

PrestamoSchema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
export const Prestamo: Model<IPrestamo> = model<IPrestamo>('prestamos', PrestamoSchema, 'prestamos');

