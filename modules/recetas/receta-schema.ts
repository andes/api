import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../core-v2/mpi/paciente/paciente.schema';
import { ProfesionalSubSchema } from '../../core/tm/schemas/profesional';
import { SnomedConcept } from '../rup/schemas/snomed-concept';
import { generarIdDesdeFecha } from './recetasController';

export const motivosRecetaSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: false
    }
});

const estadosSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['pendiente', 'vigente', 'finalizada', 'vencida', 'suspendida', 'rechazada', 'eliminada'],
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

estadosSchema.plugin(AuditPlugin);

const sistemaSchema = {
    type: String,
    enum: ['sifaho', 'recetar']
};

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

const profesionalSubschema = new mongoose.Schema({
    id: String,
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    documento: { type: String, required: true },
    profesion: String,
    matricula: Number,
    especialidad: String,
});

const medicamentoSubschema = new mongoose.Schema({
    concepto: { type: SnomedConcept, required: true },
    presentacion: String,
    unidades: String, // (mg, cc, etc.)
    cantidad: Number,
    cantEnvases: { type: Number, required: true },
    dosisDiaria: {
        dosis: { type: String, required: false },
        intervalo: mongoose.SchemaTypes.Mixed,
        dias: Number,
        notaMedica: String
    },
    tratamientoProlongado: Boolean,
    tiempoTratamiento: mongoose.SchemaTypes.Mixed,
    ordenTratamiento: Number,
    tipoReceta: {
        type: String,
        enum: ['duplicado', 'triplicado', 'simple'],
        required: false
    },
    serie: {
        type: String,
        required: false
    },
    numero: {
        type: Number,
        required: false
    }
});

export const recetaSchema = new mongoose.Schema({
    idReceta: {
        type: String,
        required: false
    },
    organizacion: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String,
        direccion: { type: String, required: false },
    },
    profesional: {
        type: profesionalSubschema,
        required: true
    },
    fechaRegistro: Date,
    fechaPrestacion: Date,
    idPrestacion: { type: String, required: true },
    idRegistro: { type: String, required: true },
    diagnostico: mongoose.SchemaTypes.Mixed,
    medicamento: {
        type: medicamentoSubschema,
        required: true
    },
    dispensa: [
        {
            idDispensaApp: String,
            fecha: Date,
            medicamentos: [{
                cantidad: Number,
                descripcion: String,
                medicamento: mongoose.SchemaTypes.Mixed,
                presentacion: String,
                unidades: String,
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
    paciente: { type: PacienteSubSchema, required: true },
    renovacion: String,
    appNotificada: [{ app: sistemaSchema, fecha: Date }],
    origenExterno: {
        id: String, // id receta creada por sistema que no es Andes
        app: sistemaSchema,
        fecha: Date
    }
});

recetaSchema.pre('save', function (next) {
    const receta: any = this;

    if (receta.estados && receta.estados.length > 0) {
        receta.estadoActual = receta.estados[receta.estados.length - 1];
    }
    if (receta.estadosDispensa && receta.estadosDispensa.length > 0) {
        receta.estadoDispensaActual = receta.estadosDispensa[receta.estadosDispensa.length - 1];
    }

    next();
});

recetaSchema.post('save', async (prescription: any) => {
    if (!prescription.idReceta) {
        const id = generarIdDesdeFecha(prescription.createdAt);
        await mongoose.model('receta').updateOne({ _id: prescription._id }, { $set: { idReceta: id } });
    }
});

recetaSchema.plugin(AuditPlugin);

recetaSchema.index({
    idPrestacion: 1,
});

export const Receta = mongoose.model('receta', recetaSchema, 'receta');
export const MotivosReceta = mongoose.model('motivosReceta', motivosRecetaSchema, 'motivosReceta');
