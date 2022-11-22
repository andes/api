import { Schema, Types, model } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';

export const CarnetPerinatalSchema = new Schema({
    fecha: Date,
    paciente: {
        id: Types.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        telefono: String,
        sexo: String,
        fechaNacimiento: Date,
        addAt: Date
    },
    controles: [
        {
            fechaControl: Date,
            idPrestacion: Types.ObjectId,
            profesional: {
                id: Types.ObjectId,
                nombre: String,
                apellido: String
            },
            organizacion: {
                id: Types.ObjectId,
                nombre: String
            },
        }
    ],
    talla: String,
    pesoPrevio: Number,
    fechaUltimoControl: Date,
    fechaProbableDeParto: Date,
    fechaUltimaMenstruacion: Date,
    primeriza: Boolean,
    fechaProximoControl: Date,
    fechaFinEmbarazo: Date,
    embarazo: {
        conceptId: String,
        term: String,
        fsn: String,
        semanticTag: String
    },
    cantidadEmbarazos: Number,
    nota: String
});

CarnetPerinatalSchema.plugin(AuditPlugin);

export const CarnetPerinatal = model('carnet-perinatal', CarnetPerinatalSchema, 'carnet-perinatal');

