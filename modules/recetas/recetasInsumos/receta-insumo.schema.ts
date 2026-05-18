import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { ProfesionalSubSchema } from '../../../core/tm/schemas/profesional';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';
const insumoSubSchema = new mongoose.Schema({
    insumo: String,
    tipo: {
        type: String,
        enum: ['dispositivo', 'nutricion', 'magistral']
    },
    requiereEspecificacion: Boolean,
    cantidad: Number,
    especificacion: String
}, { _id: false });

const cancelarSchema = new mongoose.Schema({
    idDispensaApp: {
        type: String,
        required: false
    },
    motivo: {
        type: String,
        required: false
    },
    organizacion: {
        id: String,
        nombre: String
    }
});
const sistemaSchema = {
    type: String,
    enum: ['sifaho', 'recetar']
};
const estadoDispensaSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['sin-dispensa', 'dispensada', 'dispensa-parcial'],
        required: true,
        default: 'sin-dispensa'
    },
    idDispensaApp: {
        type: String,
        required: false
    },
    fecha: Date,
    sistema: sistemaSchema,
    cancelada: {
        type: cancelarSchema,
        required: false
    }
});
const estadosSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['pendiente', 'vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada'],
        required: true,
        default: 'vigente'
    },
    motivo: {
        type: String,
        required: false
    },
    observacion: {
        type: String,
        required: false
    },
    profesional: {
        type: ProfesionalSubSchema,
        required: false
    },
    organizacionExterna: {
        id: {
            type: String,
            required: false
        },
        nombre: {
            type: String,
            required: false
        }
    }
});


export const recetaInsumoSchema = new mongoose.Schema({
    organizacion: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String
    },
    profesional: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        profesion: String,
        matricula: Number,
        especialidad: String,
    },
    fechaRegistro: Date,
    fechaPrestacion: Date,
    idPrestacion: String,
    idRegistro: String,
    diagnostico: mongoose.SchemaTypes.Mixed,
    insumo: { type: insumoSubSchema, required: true },
    dispensa: [
        {
            idDispensaApp: String,
            fecha: Date,
            insumos: [{
                cantidad: Number,
                descripcion: String,
                insumo: mongoose.SchemaTypes.Mixed,
                cantidadEnvases: Number,
                observacion: {
                    type: String,
                    required: false
                }
            }],
            organizacion: {
                id: String,
                nombre: String
            },
        }
    ],
    estados: [estadosSchema],
    estadoActual: estadosSchema,
    estadosDispensa: [estadoDispensaSchema],
    estadoDispensaActual: estadoDispensaSchema,
    paciente: PacienteSubSchema,
    renovacion: String,
    appNotificada: [{ app: sistemaSchema, fecha: Date }],
    origenExterno: {
        id: String, // id receta creada por sistema que no es Andes
        app: sistemaSchema,
        fecha: Date
    }
});

recetaInsumoSchema.pre('save', function (next) {
    const recetaInsumo: any = this;

    if (recetaInsumo.estados && recetaInsumo.estados.length > 0) {
        recetaInsumo.estadoActual = recetaInsumo.estados[recetaInsumo.estados.length - 1];
    }
    if (recetaInsumo.estadosDispensa && recetaInsumo.estadosDispensa.length > 0) {
        recetaInsumo.estadoDispensaActual = recetaInsumo.estadosDispensa[recetaInsumo.estadosDispensa.length - 1];
    }

    next();
});

recetaInsumoSchema.plugin(AuditPlugin);

recetaInsumoSchema.index({
    idPrestacion: 1,
});

export const RecetaInsumo = mongoose.model('recetasInsumo', recetaInsumoSchema, 'recetasInsumo');
