import * as mongoose from 'mongoose';

export let DeviceSchema = new mongoose.Schema({
    device_id: String,
    device_type: String,
    app_version: Number,
    session_id: String
}, { timestamps: true });

export let DeviceModel = mongoose.model('device', DeviceSchema);
