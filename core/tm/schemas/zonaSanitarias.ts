import { Schema, model } from 'mongoose';

export const zonaSanitariasSchema = new Schema({
    nombre: String,
    configuracion: {
        notificaciones: Boolean
    }
});


export const ZonaSanitaria = model('zonasSanitarias', zonaSanitariasSchema, 'zonasSanitarias');
