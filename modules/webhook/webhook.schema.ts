import * as mongoose from 'mongoose';

export const WebHookSchema = new mongoose.Schema({
    nombre: String,
    event: String,
    url: String,
    method: {
        type: String,
        default: 'POST',
        enum: ['POST', 'PUT', 'PATCH', 'GET']
    },
    headers: mongoose.SchemaTypes.Mixed, // for Token AUTH
    data: mongoose.SchemaTypes.Mixed, // a projections of data to send
    filters: [mongoose.SchemaTypes.Mixed], // posibles filtros filtros
    trasform: {
        type: String,
        required: false
    },
    active: Boolean
}, { timestamps: true });

export const WebHook = mongoose.model('webhook', WebHookSchema, 'webhook');
