import * as mongoose from 'mongoose';

export const ObraSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    codigoPuco: Number,
    nombre: String,
    financiador: String,
    prepaga: { type: Boolean, required: false },
    idObraSocial: { type: Number, required: false },
    numeroAfiliado: { type: String, required: false }
});

/**
 * Desacoplo el schema de la colleccion del que se usa como subschema
 * Mongoose te crea indices en los subschemas.
 * Consumen espacio.
 */
const ObraSocialSchemaWithIndex = ObraSocialSchema.clone();
ObraSocialSchemaWithIndex.index({ codigoPuco: 1 });

export const ObraSocial: any = mongoose.model('obraSocial', ObraSocialSchemaWithIndex, 'obraSocial');

