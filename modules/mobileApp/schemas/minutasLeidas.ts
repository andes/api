import * as mongoose from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
export let MinutasLeidasSchema = new mongoose.Schema({
    idMinuta: {
        type: mongoose.Types.ObjectId
    },
    idUsuario: {
        type: mongoose.Types.ObjectId
    },
    fechaAcceso: {
        type: Date,
        required: true
    }
});

MinutasLeidasSchema.plugin(AuditPlugin);
export let MinutasLeidas = mongoose.model('minutasLeidas', MinutasLeidasSchema, 'minutasLeidas');
