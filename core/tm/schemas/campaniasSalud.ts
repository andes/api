import { Schema, model } from 'mongoose';
import { SEXO } from '../../../shared/constantes';


const campaniasSaludSchema = new Schema({
    asunto: {
        type: String,
        required: true
    },
    cuerpo: {
        type: String,
        required: true
    },
    link: String,
    imagen: {
        type: String,
        required: true
    },
    target: {
        sexo: SEXO,
        grupoEtario: {
            desde: Number,
            hasta: Number
        }
    },
    vigencia: {
        desde: {
            type: Date,
            required: true
        },
        hasta: {
            type: Date,
            required: true
        }
    },
    /**
     * fechaPublicacion es la fecha en la que se activa la notificación push en la app mobile. Cae dentro del
     * periodo de vigencia de la campaña
     */
    fechaPublicacion: {
        type: Date,
        required: true
    },
    textoAccion: {
        type: String,
        required: true,
        default: 'Más información aquí'
    },
    activo: {
        type: Boolean,
        required: true,
        default: true
    }
});
const campania = model('campanias', campaniasSaludSchema, 'campanias');
export = campania;
