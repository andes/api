import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import * as mongoose from 'mongoose';

let schema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    tipoPrestaciones: {
        type: [tipoPrestacionSchema],
        required: true
    },
    profesionales: [nombreApellidoSchema],
    espacioFisico: nombreSchema,
    horaInicio: {
        type: Date,
        required: true
    },
    horaFin: {
        type: Date,
        required: true
    },
    intercalar: {
        type: Boolean,
        default: false
    },
    estado: {
        type: String,
        enum: ['Planificacion', 'Disponible', 'Publicada', 'Suspendida', 'Pausada'],
        required: true,
        default: 'Planificacion'
    },
    bloques: {
        type: Array,
        required: true,
        value: [{
            horaInicio: Date,
            horaFin: Date,
            cantidadTurnos: {
                type: Number,
                required: true
            },
            duracionTurno: {
                type: Number,
                required: true
            },
            descripcion: String,
            tipoPrestaciones: {
                type: [tipoPrestacionSchema],
                required: true
            },
            accesoDirectoDelDia: {
                type: Number,
                default: 0
            },
            accesoDirectoProgramado: {
                type: Number,
                default: 0
            },
            reservadoGestion: {
                type: Number,
                default: 0
            },
            reservadoProfesional: {
                type: Number,
                default: 0
            },
            pacienteSimultaneos: {
                type: Boolean,
                default: false
            },
            cantidadSimultaneos: Number,
            citarPorBloque: {
                type: Boolean,
                default: false
            },
            cantidadBloque: Number,
            turnos: [{
                horaInicio: Date,
                asistencia: {
                    type: Boolean,
                    default: false
                },
                estado: {
                    type: String,
                    enum: ['disponible', 'asignado', 'bloqueado'],
                    default: 'disponible'
                },
                tipoTurno: {
                    type: String,
                    enum: ['delDia', 'programado', 'gestion', 'profesional']
                },
                nota: String,
                motivoSuspension: {
                    type: String,
                    enum: ["Edilicia", "Profesional", "Organizacion"]
                },
                paciente: { // pensar que otros datos del paciente conviene tener
                    id: mongoose.Schema.Types.ObjectId,
                    nombre: String,
                    apellido: String,
                    documento: String,
                    telefono: String
                },
                tipoPrestacion: tipoPrestacionSchema,
                // TODO: Enlace con RUP? cuando alguien defina ALGO
                idPrestacionPaciente: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'prestacionPaciente'
                }
            }]
        }]
    }

});

// Defino Virtuals
schema.virtual('turnosDisponibles').get(function () {
    let turnosDisponibles = 0;
    this.bloques.forEach(function (bloque) {
        bloque.turnos.forEach(function (turno) {
            if (turno.estado === 'disponible') {
                turnosDisponibles++;
            }
        });
    });
    return turnosDisponibles;
});

// Validaciones
schema.pre('save', function (next) {


    // Intercalar
    if (!/true|false/i.test(this.intercalar)) {
        next(new Error("invalido"));

        // TODO: loopear bloques y definir si horaInicio/Fin son required

        // TODO: si pacientesSimultaneos, tiene que haber cantidadSimultaneos (> 0)

        // TODO: si citarPorBloque, tiene que haber cantidadBloque (> 0)

    }




    // Continuar con la respuesta del servidor
    next();

});




// Habilitar plugin de auditoría
schema.plugin(require('../../../mongoose/audit'));

// Exportar modelo
let model = mongoose.model('agenda', schema, 'agenda');

export = model;
