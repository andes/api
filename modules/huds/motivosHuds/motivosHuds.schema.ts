import { Schema, model } from 'mongoose';

export const MotivosHudsSchema = new Schema({
    id: Schema.Types.ObjectId,
    label: {
        type: String,
        required: false
    },
    key: {
        type: String,
        required: true
    },
    moduloDefault: {
        type: [String],
        required: false
    },
    descripcion: {
        type: String,
        required: false
    }

});

export const MotivosHuds = model('motivosHuds', MotivosHudsSchema, 'motivosHuds');
