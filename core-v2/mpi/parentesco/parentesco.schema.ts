
import * as mongoose from 'mongoose';

export const ParentescoSchema = new mongoose.Schema({
    nombre: String,
    opuesto: String,
    esConviviente: Boolean
});

export const Parentesco = mongoose.model('parentesco', ParentescoSchema, 'parentesco');

