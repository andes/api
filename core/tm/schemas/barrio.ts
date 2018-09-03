import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

const barrioSchema = new mongoose.Schema({
    nombre: String,
    localidad:  { type: nombreSchema }
});

const barrio = mongoose.model('barrio', barrioSchema, 'barrio');

export = barrio;
