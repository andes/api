import * as mongoose from 'mongoose';

export let usuarioSchema = new mongoose.Schema({
    usuario: Number,
    activo: Boolean,
    nombre: String,
    apellido: String,
    password: String,
    foto: String,
    organizacion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'organizacion'
        },
    roles: [String],
    permisos: [String]

});

/* Se definen los campos virtuals */
usuarioSchema.virtual('nombreCompleto').get(function () {
    return this.nombre + ' ' + this.apellido;
});

/* Creo un indice para fulltext Search */
usuarioSchema.index({
    '$**': 'text'
});

// Habilitar plugin de auditoría
usuarioSchema.plugin(require('../../../mongoose/audit'));

export let usuario = mongoose.model('usuario', usuarioSchema, 'authPermisos');
