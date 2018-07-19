import * as mongoose from 'mongoose';

var modalidadesCertificacionSchema = new mongoose.Schema({
    nombre: String,
    codigo: Number,
    descripcion: String
});

// Virtuals


var entidadFormadora = mongoose.model('modalidadesCertificacion', modalidadesCertificacionSchema, 'modalidadesCertificacion');

export = entidadFormadora;
