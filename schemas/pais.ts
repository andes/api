import * as mongoose from 'mongoose';

var paisSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String
});

var pais = mongoose.model('pais', paisSchema, 'pais');

export = pais;