import * as mongoose from 'mongoose';

export const CategoriaSchema = new mongoose.Schema({
    titulo: {
        type: String
    },
    expresionSnomed: {
        type: String
    },
    descargaAdjuntos: {
        type: Boolean
    },
    busquedaPor: {
        type: String,
        items: {
            type: String,
            enum: ['registros', 'prestaciones', 'cdas']
        }
    }
});

export const Categoria = mongoose.model('categorias', CategoriaSchema, 'categorias');
