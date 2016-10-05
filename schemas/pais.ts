import * as mongoose from 'mongoose';

var paisSchema = new mongoose.Schema({
    nombre: String
});

var pais = mongoose.model('pais', paisSchema, 'pais');

export = pais;