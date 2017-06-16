import * as mongoose from 'mongoose';

let nombreSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    }
});
export = nombreSchema;
