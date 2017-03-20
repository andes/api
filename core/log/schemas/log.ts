import * as mongoose from 'mongoose';
import * as organizacion from '../../../core/tm/schemas/organizacion';
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
    organizacion: { type: organizacion },
    modulo: {
        type: String,
        enum: ['turnos', 'pacientes', 'agenda']
    },
    operacion: {
        type: String,
        enum: ['asignar turno', 'cancelar turno', 'lista espera', 'modificar agenda']
    },
    datosOperacion: mongoose.Schema.Types.Mixed
    ,
    cliente: {
        ip: String,
        app: {
            type: String,
            enum: ['desktop', 'mobile']
        }
    },
    servidor: {
        ip: String,
    }
});

export let log = mongoose.model('log', logSchema, 'log');
