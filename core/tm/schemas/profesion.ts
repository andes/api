import * as mongoose from 'mongoose';

const profesionSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoDeFormacion: { type: String, required: true },
    codigo: Number,
    profesionCodigoRef: Number,
    identificadores: {
        type: [{
            entidad: String,
            valor: Number
        }],
        required: true,
        default: []
    },
    gestionaColegio: Boolean,
    habilitado: Boolean,
    profesionColegiada: Boolean
});

export = profesionSchema;
