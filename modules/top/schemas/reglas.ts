import { Schema, Document, model } from 'mongoose';
import { ISnomedConcept, SnomedConcept } from '../../rup/schemas/snomed-concept';
import { SemanticTag } from '../../rup/schemas/semantic-tag';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ObjectId } from '@andes/core';

export interface IReglasTOP {
    origen: {
        organizacion: {
            id: ObjectId,
            nombre: string
        },
        prestaciones: {
            prestacion: ISnomedConcept,
            auditable: boolean,
        }[]
    };
    destino: {
        organizacion: {
            id: ObjectId,
            nombre: string
        };
        prestacion: ISnomedConcept
    };
}

export const ReglasTOPSchema = new Schema({
    origen: {
        organizacion: {
            nombre: String,
            id: { type: Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestaciones: [
            {
                prestacion: SnomedConcept,
                auditable: {
                    type: Boolean,
                    default: false
                }
            }
        ],
    },
    destino: {
        organizacion: {
            nombre: String,
            id: { type: Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestacion: {
            id: Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag
        }
    }
});

ReglasTOPSchema.plugin(AuditPlugin);
export const ReglasTOP = model<IReglasTOP & Document>('reglas', ReglasTOPSchema, 'reglas');
