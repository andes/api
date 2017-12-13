import * as mongoose from 'mongoose';
import * as nombreSchema from './nombre';

let ubicacionSchema = new mongoose.Schema({
    barrio: { type: nombreSchema},
    localidad: { type: nombreSchema},
    provincia: { type: nombreSchema},
    pais: { type: nombreSchema}
});

export = ubicacionSchema;
