import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as moleculaSchema from './molecula';

var prestacionSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    codigo: [codificadorSchema],
    moleculas: [moleculaSchema],
    requiereEvolucionAdministrativa: Boolean,
    requiereEvolucionCalidad: Boolean,
    activo: Boolean
});

export = prestacionSchema;