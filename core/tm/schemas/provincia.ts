import * as mongoose from 'mongoose';
import * as lugarSchema from './lugar';

var provinciaSchema = new mongoose.Schema({
    nombre: String,
    pais: lugarSchema
});

var provincia = mongoose.model('provincia', provinciaSchema, 'provincia');

export = provincia;