import * as mongoose from 'mongoose';

const nombreSchema = new mongoose.Schema({
    // Revisar bien el uso del _id y id.
    id: { type: mongoose.SchemaTypes.ObjectId },
    nombre: {
        type: String,
        required: false
    }
});
export = nombreSchema;
