import * as mongoose from 'mongoose';

var tipoEstablecimientoSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    clasificacion: String,
    idTipoEfector: Number
});

export = tipoEstablecimientoSchema;