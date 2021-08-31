import * as mongoose from 'mongoose';

export const schema = new mongoose.Schema();
schema.add({
    tipo: String,
    estado: String,
    numeroComprobante: String
});
