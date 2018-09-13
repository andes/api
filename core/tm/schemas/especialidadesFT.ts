import * as mongoose from 'mongoose';

const especialidadesFTSchema = new mongoose.Schema({
    descripcion: String,
});

// Exportar modelo
const model = mongoose.model('especialidadesFT', especialidadesFTSchema, 'especialidadesFT');

export = model;
