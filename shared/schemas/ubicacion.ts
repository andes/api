import * as mongoose from 'mongoose';
import {NombreSchema } from './nombre';

// [TODO] Poner localidad, provincia como required

export const UbicacionSchema = new mongoose.Schema({
    barrio: { type: NombreSchema },
    localidad: { type: NombreSchema },
    provincia: { type: NombreSchema },
    pais: { type: NombreSchema }
});

