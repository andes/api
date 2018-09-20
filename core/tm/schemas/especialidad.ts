import * as mongoose from 'mongoose';

const especialidadSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    descripcion: String,
    complejidad: Number,
    disciplina: String,
    codigo: {
        sisa: {
            type: String,
            required: true
        }
    },
    activo: {
        type: Boolean,
        required: true,
        default: true
    }
});

export = especialidadSchema;

