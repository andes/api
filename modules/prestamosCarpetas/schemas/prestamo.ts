import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import * as constantes from './constantes';
import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { Number } from 'core-js/library/web/timers';

let schema = new mongoose.Schema({
    paciente: {
        type: pacienteSchema
    },
    // numero: Number,
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
        turno: {
            idProfesional: mongoose.Schema.Types.ObjectId,
            idEspacioFisico:  mongoose.Schema.Types.ObjectId,
            idConceptoTurneable: mongoose.Schema.Types.ObjectId
        }
    },
    datosDevolucion: {
        observaciones: String,
        estado: {
            type: String,
            enum: ['Normal', 'En mal estado', 'Fuera de término', 'Hojas o documentación faltante']
        } 
    }
});

schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('prestamo', schema, 'prestamo');

export = model;
