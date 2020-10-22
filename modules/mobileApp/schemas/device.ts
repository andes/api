import * as mongoose from 'mongoose';

export const DeviceSchema = new mongoose.Schema({
    device_id: String,
    device_type: String,
    app_version: Number,
    session_id: String
}, { timestamps: true });

export const DeviceModel = mongoose.model('device', DeviceSchema);
