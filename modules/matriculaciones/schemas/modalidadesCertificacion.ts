import * as mongoose from 'mongoose';

const modalidadesCertificacionSchema = new mongoose.Schema({
    nombre: String,
    codigo: Number,
    descripcion: String
});

// Virtuals


const entidadFormadora = mongoose.model('modalidadesCertificacion', modalidadesCertificacionSchema, 'modalidadesCertificacion');

export = entidadFormadora;
