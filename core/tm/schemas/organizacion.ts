import * as mongoose from 'mongoose';
import * as ubicacionSchema from './ubicacion';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';

export var organizacionSchema = new mongoose.Schema({
    codigo: {
        sisa: {
            type: String,
            required: true
        },
        cuie: String,
        remediar: String
    },
    nombre: String,
    tipoEstablecimiento: tipoEstablecimientoSchema,
    contacto: [contactoSchema],
    direccion: direccionSchema,
    edificio: [edificioSchema],
    nivelComplejidad: Number,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
    fechaAlta: Date,
    fechaBaja: Date
});

export var organizacion = mongoose.model('organizacion', organizacionSchema, 'organizacion');
//export = organizacion;