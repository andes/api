import { Schema, model } from 'mongoose';
import { SEXO } from './constantes';


const campaniasSaludSchema = new Schema({
    asunto: String,
    cuerpo: String,
    link: String,
    imagen: String,
    target: {
        sexo: SEXO,
        grupoEtareo: {
            desde: Number,
            hasta: Number
        }
    },
    vigencia: {
        desde: Date,
        hasta: Date
    },
    fechaPublicacion: Date
});

let campania = model('campanias', campaniasSaludSchema, 'campanias');
export = campania;
