import * as mongoose from 'mongoose';

export const WebHookLogSchema = new mongoose.Schema({
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
    response: mongoose.SchemaTypes.Mixed,
    updatedAt: Date
}, { timestamps: true });
export const WebHookLog = mongoose.model('webhookLog', WebHookLogSchema, 'webhookLog');