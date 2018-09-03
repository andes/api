import * as mongoose from 'mongoose';

const tipoEstablecimientoSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String,
    clasificacion: String,
    idTipoEfector: Number
});

export = tipoEstablecimientoSchema;
