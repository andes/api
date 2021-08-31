import { model, Model, Types, Document, Schema, SchemaTypes } from 'mongoose';
import { SnomedConcept, ISnomedConcept } from './snomed-concept';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { NombreSchemaV2 } from '../../../shared/schemas';

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

export const PlantillasRUPSchema = new Schema({
    esSolicitud: Boolean,
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
        type: NombreSchemaV2,
        required: false
    },
    link: String,
    esArchivoLink: Boolean,
    title: String,
    descripcion: String,
    target: { type: SnomedConcept, required: false }
});

PlantillasRUPSchema.plugin(AuditPlugin);


export const PlantillasRUP: Model<IPlantillasRUP> = model<IPlantillasRUP>('plantillasRUP', PlantillasRUPSchema, 'plantillasRUP');
