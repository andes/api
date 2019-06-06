import * as mongoose from 'mongoose';

/**
 * Tabla maestras?
 * Listado de obra sociales.
 */
export const ObraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String,
    financiador: String
});

ObraSocialSchema.index({ codigoPuco: 1 });

export let ObraSocial: any = mongoose.model('obraSocial', ObraSocialSchema, 'obraSocial');

