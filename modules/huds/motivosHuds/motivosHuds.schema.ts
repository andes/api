import { Schema, model } from 'mongoose';

export const MotivosHudsSchema = new Schema({
    id: Schema.Types.ObjectId,
    motivo: {
        type: String,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    moduloDefault: {
        type: String,
        required: false
    },

});

export const MotivosHuds = model('motivosHuds', MotivosHudsSchema, 'motivosHuds');
