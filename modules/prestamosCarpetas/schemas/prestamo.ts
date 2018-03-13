import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { espacioFisicoSchema } from '../../../modules/turnos/schemas/espacioFisico';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as constantes from './constantes';
import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { Number, Object } from 'core-js/library/web/timers';

let schema = new mongoose.Schema({
    paciente: {
        id: mongoose.Schema.Types.ObjectId,
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
        agendaId: mongoose.Schema.Types.ObjectId,
        turno: {
            id: mongoose.Schema.Types.ObjectId,
            profesionales: [nombreApellidoSchema],
            tipoPrestaciones: [tipoPrestacionSchema],
            espacioFisico: espacioFisicoSchema
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
