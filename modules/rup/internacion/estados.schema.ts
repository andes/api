import { SchemaTypes, Schema, model, Types, Model, Document } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { SnomedConcept } from '../schemas/snomed-concept';

const EstadoKey = String;
type IEstadoKey = String;

export interface IEstados {
    organizacion: Types.ObjectId;
    ambito: String;
    capa: String;
    estados: { key: IEstadoKey, label: String, color: String, icon: String }[];
    relaciones: { origen: IEstadoKey, destino: IEstadoKey }[];
}

export interface IEstadosDocument extends Document, IEstados { }

const EstadoSchema = new Schema({
    organizacion: SchemaTypes.ObjectId,
    ambito: String,
    capa: String,
    estados: [{
        _id: false,
        key: EstadoKey,
        label: String,
        color: String,
        icon: String,
        acciones: [{
            label: String,
            tipo: String,
            parametros: {
                concepto: { type: SnomedConcept, require: false }
            }
        }]
    }],
    relaciones: [{
        nombre: String,
        origen: EstadoKey,
        destino: EstadoKey,
        color: String,
        icon: String,
        accion: String,
        parametros: [{
            label: String,
            options: [{
                nombre: String
            }]
        }]
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

export const Estados: Model<IEstadosDocument> = model('internacionEstados', EstadoSchema, 'internacionEstados');

