// import { mpi } from './../../../config';
import * as mongoose from 'mongoose';
import * as organizacion from '../../../core/tm/schemas/organizacion';

/**
 * Descripcion Operaciones logs:
 * MPI:
 * scan == escaneo exitoso
 * scanFail == escaneo fallido
 * macheoAlto == Macheo con un % superior a 90
 * posibleDuplicado == Nuevo paciente, pero matchea con un porcentaje entre 80 y 90 con otro.
 * validadoScan == 'Paciente encontrado por el string del scan'
 * 
 */

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
        enum: ['mpi', 'turnos', 'rup', 'configTipoPrestacion']
    },
    operacion: {
        type: String,
        enum: [
            // Operaciones genéricas
            'query', 'insert', 'update', 'delete',
            // Operaciones de módulos
            // ... Mpi
            'macheoAlto', 'posibleDuplicado', 'reportarError', 'validadoScan', 'scan', 'scanFail',
            // OperacionesElastic
            'elasticInsert', 'elasticInsertInPut' , 'elasticUpdate', 'elasticDelete', 'elasticError',
            // ... Turnos
            'asignarTurno', 'cancelarTurno', 'listaEspera',
            // ... RUP
            'pacientes'
        ]
    },
    datosOperacion: mongoose.Schema.Types.Mixed,
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
