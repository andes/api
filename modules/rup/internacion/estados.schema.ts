import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Document, model, Model, Schema, SchemaTypes, Types } from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';

const EstadoKey = String;
type IEstadoKey = String;

export interface IEstados {
    organizacion: Types.ObjectId;
    ambito: String;
    capa: String;
    estados: { key: IEstadoKey; label: String; color: String; icon: String }[];
    relaciones: { origen: IEstadoKey; destino: IEstadoKey }[];
    historialMedico: boolean;
    listadoInternacion: boolean;
    configPases: { sala: Types.ObjectId; allowCama: boolean };
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
                concepto: { type: SnomedConcept, require: false },
                unidadOrganizativa: { type: [String], require: false }
            }
        }],
        checkRupTiposPrestacion: {
            type: Boolean,
            required: false
        }
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
    }],
    ingresos: SchemaTypes.Mixed,
    columns: SchemaTypes.Mixed,
    turnero: SchemaTypes.Mixed,
    historialMedico: Boolean,
    listadoInternacion: Boolean,
    planIndicaciones: {
        required: false,
        type: {
            tipoPrestacion: SnomedConcept,
            secciones: [{
                concepto: SnomedConcept,
                color: String,
                icono: String,
                requiereFrecuencia: Boolean,
                requiereAceptacion: Boolean,
                registro: SnomedConcept
            }]
        }
    }
});

EstadoSchema.methods.check = function (origen, destino, idInternacionOrigen, idInternacionDestino) {
    if (origen === destino) {
        // true en caso de cambio de UO o cama (no)censable. De lo contrario debería tratarse de estados (y camas) distintos.
        return (!idInternacionOrigen && !idInternacionDestino) || idInternacionOrigen && idInternacionDestino && idInternacionOrigen.toString() === idInternacionDestino.toString();
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

