import { Schema, model, Types } from 'mongoose';

export const ProfesionalPermisosEspecialesSchema = new Schema({
    id: Types.ObjectId,
    profesional: Schema.Types.ObjectId,
    prestacion: Schema.Types.ObjectId,
    horaInicio: {
        type: Date,
    },
    horaFin: {
        type: Date,
        required: true
    },

});
export const ProfesionalPermisosEspeciales = model('profesionalPermisosEspeciales', ProfesionalPermisosEspecialesSchema, 'profesionalPermisosEspeciales');
