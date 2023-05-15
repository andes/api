import { Schema, Types, model } from 'mongoose';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

export const CarnetPerinatalSchema = new Schema({
    fecha: Date,
    paciente: PacienteSubSchema,
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

