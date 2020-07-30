import * as mongoose from 'mongoose';

const nombreSchema = new mongoose.Schema({
    id: { type: mongoose.SchemaTypes.ObjectId, required: false },
    nombre: {
        type: String,
        required: false
    }
});
export = nombreSchema;
