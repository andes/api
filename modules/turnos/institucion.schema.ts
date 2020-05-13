import { model, Schema, Model, Document } from 'mongoose';
import * as direccionSchema from '../../core/tm/schemas/direccion';
import * as contactoSchema from '../../core/tm/schemas/contacto';


export interface IInstitucion extends Document {
    nombre: String;
    detalle: String;
    tipo: String;
    contacto: { valor: String };
    direccion: { valor: String };
    activo: Boolean;
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'clausurado', 'baja permanente']
    };
}

export let InstitucionSchema = new Schema({
    nombre: String,
    detalle: String,
    tipo: String,
    contacto: {
        type: contactoSchema
    },
    direccion: {
        type: direccionSchema
    },
    activo: Boolean,
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'clausurado', 'baja permanente'],
        default: 'disponible'
    }
});


export const Institucion: Model<IInstitucion> = model('institucion', InstitucionSchema, 'institucion');
