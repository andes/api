import { Schema, Types, model } from 'mongoose';
import { DireccionSchema, ContactoSchema } from '../../../shared/schemas';

export let schema = new Schema({
    idvacuna: Number,
    codigo: String,
    documento: String,
    apellido: String,
    nombre: String,
    fechaNacimiento: Date,
    sexo: {
        type: String,
        enum: ['masculino', 'femenino']
    },
    vacuna: String,
    dosis: String,
    lote: String,
    fechaAplicacion: Date,
    efector: String,
    esquema: String,
    condicion: String,
    paciente: {
        id: Types.ObjectId,
        zona: DireccionSchema,
        contacto: ContactoSchema
    },
    prestacionesAsociadas: [{
        id: Types.ObjectId,
        fecha: Date,
        tipoPrestacion: String
    }],
    profesional: {
        id: Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String
    },
    inscripcion: {
        id: Types.ObjectId,
        fechaRegistro: Date,
        email: String,
        telefono: String,
        grupo: {
            id: Schema.Types.ObjectId,
            nombre: String
        }
    }
});

export let vacunasApi = model('vacunasApi', schema, 'nomivac');
