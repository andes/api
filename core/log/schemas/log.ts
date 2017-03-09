import * as mongoose from 'mongoose';
import { organizacionSchema } from '../../../core/tm/schemas/organizacion';

export let logSchema = new mongoose.Schema({
    fecha: [{
        type: Date,
        required: true
    }],
    usuario: {
        type: String,
        es_indexed: true
    },
    organizacion: {
        organizacion: organizacionSchema,
        required: true
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
