import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

const EstadoKey = String;

const EstadoSchema = new mongoose.Schema({
    organizacion: {
        type: nombreSchema,
        required: true
    },
    ambito: String,
    capa: String,
    estados: [{
        _id: false,
        key: EstadoKey,
        label: String,
        color: String,
        icon: String
    }],
    relaciones: [{
        origen: EstadoKey,
        destino: EstadoKey,
    }]
});

export const Estados = mongoose.model('internacionEstados', EstadoSchema, 'internacionEstados');
