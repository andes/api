import * as mongoose from 'mongoose';
import { CONTACTO } from './constantes';
import { IContactoDoc } from '../../shared/interface';

export const ContactoSchema = new mongoose.Schema({
    tipo: CONTACTO,
    valor: String,
    ranking: Number, // Specify preferred order of use (1 = highest)
    ultimaActualizacion: Date,
    activo: {
        type: Boolean,
        required: true,
        default: true
    },
});

export const Contacto = mongoose.model<IContactoDoc>('contacto', ContactoSchema, 'contacto');
