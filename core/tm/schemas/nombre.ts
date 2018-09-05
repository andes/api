import * as mongoose from 'mongoose';

const nombreSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    }
});
export = nombreSchema;
