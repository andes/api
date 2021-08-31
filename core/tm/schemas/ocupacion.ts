import * as mongoose from 'mongoose';

const schema = new mongoose.Schema({
    codigo: {
        type: String
    },
    nombre: {
        type: String
    }
});
// export let ocupacionSchema = schema;
export const model = mongoose.model('ocupaciones', schema, 'ocupaciones');
