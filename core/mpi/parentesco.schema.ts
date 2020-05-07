
import * as mongoose from 'mongoose';

export const parentescoSchema = new mongoose.Schema({
    nombre: String,
    opuesto: String
});

export const parentesco = mongoose.model('parentesco', parentescoSchema, 'parentesco');

