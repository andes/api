import * as mongoose from 'mongoose';

const schema = new mongoose.Schema({
    nombre: String,
});
// export let ocupacionSchema = schema;
export let ocupacion = mongoose.model('ocupaciones', schema, 'ocupaciones');
