import * as mongoose from 'mongoose';

export let schema = new mongoose.Schema();
schema.add({
    tipo: String,
    estado: String,
    numeroComprobante: String
});
