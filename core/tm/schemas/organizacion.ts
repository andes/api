import * as mongoose from 'mongoose';
import * as edificioSchema from './edificio';
import * as direccionSchema from './direccion';
import * as contactoSchema from './contacto';
import * as tipoEstablecimientoSchema from './tipoEstablecimiento';

let _schema = new mongoose.Schema({
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

export let schema = _schema;
export let model = mongoose.model('organizacion', _schema, 'organizacion');
