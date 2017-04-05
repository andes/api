import { configMpi } from './../../../config';
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
        enum: ['mpi', 'turnos', 'rup']
    },
    operacion: {
        type: String,
        enum: [
            // Operaciones genéricas
            'query', 'insert', 'update', 'delete', 'scan', 'scanFail',
            // Operaciones de módulos
            // ... Mpi
            'macheoAlto', 'posibleDuplicado', 'reportarError',
            // ... Turnos
            'asignarTurno', 'cancelarTurno', 'listaEspera'
            // ... RUP
        ]
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
