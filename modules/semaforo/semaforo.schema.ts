import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';

export const SemaforoSchema = new mongoose.Schema({
    name: String,
    options: [
        {
            id: Number,
            priority: Number,
            min: Number,
            max: Number,
            value: mongoose.Schema.Types.Mixed,
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
export const Semaforo = mongoose.model('semaforo', SemaforoSchema, 'semaforo');
