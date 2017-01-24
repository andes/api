import * as mongoose from 'mongoose';
import * as codificadorSchema from './codificador';
import * as atomoSchema from './atomo';

var prestacionSchema = new mongoose.Schema({
    clave: String,
    nombre: String,
    codigo: codificadorSchema,
    //tipo: String,
    moleculas: [{
        prestacion: prestacionSchema,
        requerido: Boolean
    }],
    componente: String,
    requiereEvolucionAdministrativa: Boolean,
    requiereEvolucionCalidad: Boolean,
});

export = prestacionSchema;