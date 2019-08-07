import * as mongoose from 'mongoose';

import { ParentescoSchema } from '@andes/mpi/parentesco/parentesco.schema';
import { IRelacionDoc } from '../interface/Relacion.interface';

export const RelacionSchema = new mongoose.Schema({
    relacion: ParentescoSchema,
    referencia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'paciente'
    },
    nombre: String,
    apellido: String,
    documento: String,
    foto: String
});

export const Relacion = mongoose.model<IRelacionDoc>('relaciones', RelacionSchema);
