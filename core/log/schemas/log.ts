import * as mongoose from 'mongoose';
import { organizacionSchema } from '../../../core/tm/schemas/organizacion';

export let logSchema = new mongoose.Schema({
    fecha: {
        type: Date
    },
    usuario: {
        nombreCompleto: String,
        nombre: String,
        apellido: String,
        username: Number,
        documento: Number
    },
    organizacion: {
        organizacion: organizacionSchema
    },
    modulo: {
        type: String,
        enum: ['turnos', 'pacientes']
    },
    operacion: {
        type: String,
        enum: ['asignar turno', 'cancelar turno']
    },
    datosOperacion: [
        mongoose.Schema.Types.Mixed
    ],
    cliente: {
        ip: String,
        app: {
            type: String,
            enum: ['escritorio', 'móvil']
        }
    },
    servidor: {
        ip: String,
    }
});

export let log = mongoose.model('log', logSchema, 'log');
