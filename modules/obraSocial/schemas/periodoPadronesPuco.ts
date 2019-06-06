import * as mongoose from 'mongoose';

/**
 * @deprecated
 */
const periodoPadronesPucoSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    version: Date
});

export let periodoPadronesPuco = mongoose.model('periodoPadronesPuco', periodoPadronesPucoSchema, 'periodoPadronesPuco');
