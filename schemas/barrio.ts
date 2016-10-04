import * as mongoose from 'mongoose';

var barrioSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    nombre: String,
    localidad: {
        id: mongoose.Schema.Types.ObjectId,
        nombre: String
    }
});

var barrio = mongoose.model('barrio', barrioSchema, 'barrio');

export = barrio;