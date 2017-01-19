import * as mongoose from 'mongoose';
import * as lugarSchema from './lugar';

var barrioSchema = new mongoose.Schema({
    nombre: String,
    localidad: lugarSchema
});

var barrio = mongoose.model('barrio', barrioSchema, 'barrio');

export = barrio;