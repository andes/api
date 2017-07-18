
import * as mongoose from 'mongoose';

export let parentezcoSchema = new mongoose.Schema({
    nombre: String,
    opuesto: String
});

export let modelParentesco = mongoose.model('parentesco', parentezcoSchema, 'parentesco');

