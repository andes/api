import * as mongoose from 'mongoose';

export const schema = new mongoose.Schema({
    capitulo: String,
    grupo: String,
    causa: String,
    subcausa: String,
    codigo: String,
    nombre: String,
    sinonimo: String,
    c2: Boolean,
    reporteC2: String,
    ficha: String
});

/**
 * Desacoplo el schema de la colleccion del que se usa como subschema
 * Mongoose te crea indices en los subschemas.
 * Consumen espacio.
 */

const Cie10SchemaWithIndex = schema.clone();
Cie10SchemaWithIndex.index({ codigo: 1 });
export const model = mongoose.model('cie10', Cie10SchemaWithIndex, 'cie10');
