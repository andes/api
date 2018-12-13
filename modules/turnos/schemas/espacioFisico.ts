import { SnomedConcept, ISnomedConcept } from './../../rup/schemas/snomed-concept';
import { Document, Schema, Model, model } from 'mongoose';
import * as edificioSchema from '../../../core/tm/schemas/edificio';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export interface IEspacioFisico extends Document {
    nombre: String;
    detalle: String;
    descripcion: String;
    organizacion: { nombre: String; };
    edificio: { nombre: String; };
    sector: { nombre: String; };
    servicio: { nombre: String; };
    equipamiento: [ISnomedConcept];
    activo: Boolean;
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'clausurado', 'baja permanente']
    };
}

export let espacioFisicoSchema = new Schema({
    nombre: String,
    detalle: String,
    descripcion: String,
    organizacion: { type: nombreSchema },
    edificio: { type: edificioSchema },
    sector: { type: nombreSchema },
    servicio: { type: nombreSchema },
    equipamiento: [SnomedConcept],
    activo: Boolean,
    estado: {
        type: String,
        enum: ['disponible', 'mantenimiento', 'clausurado', 'baja permanente'],
        default: 'disponible'
    }
});

export let espacioFisico: Model<IEspacioFisico> = model('espacioFisico', espacioFisicoSchema, 'espacioFisico');
