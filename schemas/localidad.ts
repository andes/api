import * as mongoose from 'mongoose';

var localidadSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    provincia: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});

var localidad = mongoose.model('localidad', localidadSchema, 'localidad');

export = localidad;