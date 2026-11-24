import * as mongoose from 'mongoose';

export const schema = new mongoose.Schema({ // Export the schema itself
    codigo: {
        type: String
    },
    nombre: {
        type: String
    }
});

export const model = mongoose.model('ocupaciones', schema, 'ocupaciones');
