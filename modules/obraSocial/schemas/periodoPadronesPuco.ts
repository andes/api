import * as mongoose from 'mongoose';

let periodoPadronesPucoSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    version: String
});

export let periodoPadronesPuco = mongoose.model('periodoPadronesPuco', periodoPadronesPucoSchema, 'periodoPadronesPuco');
