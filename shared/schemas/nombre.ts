import * as mongoose from 'mongoose';

export const NombreSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: false
    }
});

export const NombreSchemaV2 = new mongoose.Schema({
    id: mongoose.Types.ObjectId,
    nombre: {
        type: String,
        required: false
    }
}, { _id: false });
