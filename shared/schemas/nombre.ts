import * as mongoose from 'mongoose';

export const NombreSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: false
    }
});
