import { Schema, model, SchemaTypes } from 'mongoose';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';

export const CondicionPacienteSchema: Schema = new Schema({

    tipoPrestacion: tipoPrestacionSchema,
    rules: SchemaTypes.Mixed,
    activo: Boolean
});

export const CondicionPaciente = model('condicionesPaciente', CondicionPacienteSchema, 'condicionesPaciente');
