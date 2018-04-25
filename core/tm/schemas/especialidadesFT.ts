import * as mongoose from 'mongoose';

let especialidadesFTSchema = new mongoose.Schema({
    descripcion: String,
});

// Exportar modelo
let model = mongoose.model('especialidadesFT', especialidadesFTSchema, 'especialidadesFT');

export = model;
