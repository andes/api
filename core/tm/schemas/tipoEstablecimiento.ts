import * as mongoose from 'mongoose';

let tipoEstablecimientoSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    clasificacion: String,
    idTipoEfector: Number
});

export = tipoEstablecimientoSchema;
