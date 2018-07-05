import * as mongoose from 'mongoose';

export let turneroPantallaSchema = new mongoose.Schema({
    nombre: String,
    token: String,
    organizacion: mongoose.SchemaTypes.ObjectId,
    espaciosFisicos: [{
        _id: false,
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String
    }]
});

export let turneroPantallaModel = mongoose.model('turneroPantalla', turneroPantallaSchema, 'turneroPantalla');
