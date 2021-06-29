import * as mongoose from 'mongoose';
export const nomivacLoteSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: String,
        required: true
    },
    habilitado: {
        type: Boolean,
        required: true,
        default: false
    },
    descripcion: String,
    vacuna: {
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'nomivacVacunas'
        },
        codigo: Number,
        nombre: String
    }
});
nomivacLoteSchema.index({
    codigo: 1
});
export let nomivacLotes = mongoose.model('nomivacLotes', nomivacLoteSchema, 'nomivacLotes');
