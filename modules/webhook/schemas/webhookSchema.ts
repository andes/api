import * as mongoose from 'mongoose';

export let WebHookSchema = new mongoose.Schema({
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

}, { timestamps: true });

export let WebHook = mongoose.model('webhook', WebHookSchema, 'webhook');

export let WebHookLogSchema = new mongoose.Schema({
    event: String,
    url: String,
    method: {
        type: String,
        default: 'POST',
        enum: ['POST', 'PUT', 'PATCH', 'GET']
    },
    headers: mongoose.SchemaTypes.Mixed, // for Token AUTH
    body: mongoose.SchemaTypes.Mixed, // a projections of data to send
    subscriptionId: mongoose.SchemaTypes.ObjectId,
    status: Number,
    response: mongoose.SchemaTypes.Mixed


}, { timestamps: true });

export let WebHookLog = mongoose.model('webhookLog', WebHookLogSchema, 'webhookLog');
