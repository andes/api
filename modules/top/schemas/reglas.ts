import * as mongoose from 'mongoose';
import { SnomedConcept } from '../../rup/schemas/snomed-concept';
import { SemanticTag } from '../../rup/schemas/semantic-tag';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

let reglasSchema = new mongoose.Schema({
    origen: {
        organizacion: {
            nombre: String,
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
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
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'organizacion' }
        },
        prestacion: {
            id: mongoose.Schema.Types.ObjectId,
            conceptId: String,
            term: String,
            fsn: String,
            semanticTag: SemanticTag
        }
    }
});
// Habilitar plugin de auditoría
reglasSchema.plugin(AuditPlugin);
const model = mongoose.model('reglas', reglasSchema, 'reglas');
export = model;
