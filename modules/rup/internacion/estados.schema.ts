import { SchemaTypes, Schema, model } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

const EstadoKey = String;

const EstadoSchema = new Schema({
    // organizacion: {
    //     type: nombreSchema,
    //     required: true
    // },
    organizacion: SchemaTypes.ObjectId,
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

EstadoSchema.plugin(AuditPlugin);

export const Estados = model('internacionEstados', EstadoSchema, 'internacionEstados');
