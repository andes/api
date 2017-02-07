import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

var barrioSchema = new mongoose.Schema({
    nombre: String,
    localidad: nombreSchema
});

var barrio = mongoose.model('barrio', barrioSchema, 'barrio');

export = barrio;