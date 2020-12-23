import * as mongoose from 'mongoose';

export const nomivacCategoriaSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigo: {
        type: Number,
        required: true
    },
    nombre: {
        type: String,
        required: true
    }
});

nomivacCategoriaSchema.index({
    codigo: 1
});
export let nomivacCategoria = mongoose.model('nomivacCategoriasAplicacion', nomivacCategoriaSchema, 'nomivacCategoriasAplicacion');
