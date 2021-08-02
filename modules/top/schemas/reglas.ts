import { ObjectId } from '@andes/core';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { Document, model, Schema } from 'mongoose';
import { ITipoPrestacion } from '../../../core/tm/schemas/tipoPrestacion';
import { ISnomedConcept, SnomedConcept } from '../../rup/schemas/snomed-concept';

export interface IReglasTOP {
    origen: {
        estado?: String;
        organizacion: {
            id: ObjectId;
            nombre: string;
        };
        prestaciones: {
            prestacion: ISnomedConcept;
            auditable: boolean;
        }[];
    };
    destino: {
        organizacion: {
            id: ObjectId;
            nombre: string;
        };
        prestacion: ISnomedConcept;
        inicio: string;
        servicioIntermedioId: ObjectId;
        turneable: boolean;
        agendas: [ITipoPrestacion];
        informe?: 'none' | 'optional' | 'required';

    };
}

export const ReglasTOPSchema = new Schema({
    origen: {
        estado: { type: String, required: false },
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
        // prestacion: {
        //     id: Schema.Types.ObjectId,
        //     conceptId: String,
        //     term: String,
        //     fsn: String,
        //     semanticTag: SemanticTag
        // },
        prestacion: Schema.Types.Mixed, // Puede ser una prestación o un array
        inicio: String,
        servicioIntermedioId: Schema.Types.ObjectId,
        turneable: {
            type: Boolean,
            default: false
        },
        informe: {
            type: String,
            require: false
        }
    }
});

ReglasTOPSchema.plugin(AuditPlugin);
ReglasTOPSchema.index({
    'origen.organizacion.id': 1,
    'origen.prestaciones.prestacion.conceptId': 1,
    'destino.prestacion.conceptId': 1,
    'destino.organizacion.id': 1
}, { name: 'reglas-top' });
export const ReglasTOP = model<IReglasTOP & Document>('reglas', ReglasTOPSchema, 'reglas');
