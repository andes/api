import { Schema, model } from 'mongoose';

export const zonaSanitariasSchema = new Schema({
    nombre: String
});


export const ZonaSanitaria = model('zonasSanitarias', zonaSanitariasSchema, 'zonasSanitarias');
