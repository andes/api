import * as mongoose from 'mongoose';

let modalidadesCertificacionSchema = new mongoose.Schema({
    nombre: String,
    codigo: Number,
    descripcion: String
});

// Virtuals


let entidadFormadora = mongoose.model('modalidadesCertificacion', modalidadesCertificacionSchema, 'modalidadesCertificacion');

export = entidadFormadora;
