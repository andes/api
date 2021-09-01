import * as mongoose from 'mongoose';

export const nomivacCondicionSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    sexo: String,
    orden: String,
    habilitado: {
        type: Boolean,
        required: true,
        default: false
    }
});

nomivacCondicionSchema.index({
    codigo: 1
});
export const nomivacCondicion = mongoose.model('nomivacCondiciones', nomivacCondicionSchema, 'nomivacCondiciones');
