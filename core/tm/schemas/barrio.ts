import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

let barrioSchema = new mongoose.Schema({
    nombre: String,
    localidad:  { type: nombreSchema }
});

let barrio = mongoose.model('barrio', barrioSchema, 'barrio');

export = barrio;
