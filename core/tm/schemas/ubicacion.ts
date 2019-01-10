import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

const ubicacionSchema = new mongoose.Schema({
    barrio: { type: String },
    localidad: { type: nombreSchema },
    provincia: { type: nombreSchema },
    pais: { type: nombreSchema }
});

export = ubicacionSchema;
