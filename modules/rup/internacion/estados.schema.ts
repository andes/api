import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

const EstadoKey = String;

const EstadoSchema = new mongoose.Schema({
    // organizacion: {
    //     type: nombreSchema,
    //     required: true
    // },
    organizacion: mongoose.SchemaTypes.ObjectId,
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

EstadoSchema.methods.check = function (origen, destino) {
    if (origen === destino) {
        return true;
    }

    for (const relacion of this.relaciones) {
        if (relacion.origen === origen && relacion.destino === destino) {
            return true;
        }
    }
    return false;
};

export const Estados = mongoose.model('internacionEstados', EstadoSchema, 'internacionEstados');
