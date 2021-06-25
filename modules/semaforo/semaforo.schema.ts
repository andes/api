import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';

export const SemaforoSchema = new mongoose.Schema({
    name: String,
    options: [
        {
            id: Number,
            priority: Number,
            label: String,
            color: String,
            itemRowStyle: {
                border: String,
                hover: String,
                background: String
            }
        }
    ]
});

SemaforoSchema.plugin(AuditPlugin);
export let Semaforo = mongoose.model('semaforo', SemaforoSchema, 'semaforo');
