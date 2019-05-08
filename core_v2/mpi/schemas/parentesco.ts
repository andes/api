import * as mongoose from 'mongoose';

export const ParentescoSchema = new mongoose.Schema({
    nombre: String,
    opuesto: String
});

export const Parentesco = mongoose.model('parentesco_2', ParentescoSchema, 'parentesco');
