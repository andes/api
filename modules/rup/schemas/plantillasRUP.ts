import { model, Model, Types, Document, Schema, SchemaTypes } from 'mongoose';
import { SnomedConcept, ISnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export interface IPlantillasRUP extends Document {
    profesional: {
        id: Types.ObjectId;
        nombre: string;
        apellido: string;
        documento: Number;
    };
    organizacion: {
        id: Types.ObjectId;
        nombre: String;
    };
    tipoPrestacion: ISnomedConcept;
    frecuentes: [{
        // tipo de prestacion desde la cual se solicita
        concepto: ISnomedConcept;
        esSolicitud: Boolean;
        frecuencia: number;
    }];
}

export let PlantillasRUPSchema = new Schema({
    expression: String,
    conceptos: [SnomedConcept],
    profesional: {
        type: {
            id: SchemaTypes.ObjectId,
            nombre: String,
            apellido: String,
            documento: Number
        },
        required: false
    },
    organizacion: {
        type: {
            id: Schema.Types.ObjectId,
            nombre: String
        },
        required: false
    },

    title: String,
    descripcion: String
});

PlantillasRUPSchema.plugin(AuditPlugin);


export let PlantillasRUP: Model<IPlantillasRUP> = model<IPlantillasRUP>('plantillasRUP', PlantillasRUPSchema, 'plantillasRUP');
