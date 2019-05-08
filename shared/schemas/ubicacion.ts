import * as mongoose from 'mongoose';
import {NombreSchema } from './nombre';

export const UbicacionSchema = new mongoose.Schema({
    barrio: { type: NombreSchema },
    localidad: { type: NombreSchema },
    provincia: { type: NombreSchema },
    pais: { type: NombreSchema }
});

