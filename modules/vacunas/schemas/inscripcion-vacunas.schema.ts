
import { Schema, Types, model } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

export const InscripcionVacunaSchema = new Schema({
    fechaRegistro: Date,
    nroTramite: String,
    documento: String,
    nombre: String,
    apellido: String,
    fechaNacimiento: Date,
    sexo: String,
    grupo: {
        id: Schema.Types.ObjectId,
        nombre: String
    },
    email: String,
    telefono: String,
    localidad: { type: nombreSchema },
    estado: {
        type: String,
        required: true,
        enum: ['pendiente', 'habilitado', 'inhabilitado']
    },
    validado: Boolean,
    personal_salud: Boolean,
    validaciones: [String],
    paciente: {
        id: Types.ObjectId,
        addAt: Date,
    },
    cud: String,
    alergia: Boolean,
    condicion: Boolean,
    enfermedad: Boolean,
    convaleciente: Boolean,
    aislamiento: Boolean,
    vacuna: Boolean,
    plasma: Boolean,
    amamantando: Boolean,
    embarazada: Boolean,
    profesion: String,
    matricula: String,
    establecimiento: String,
    localidadEstablecimiento: { type: nombreSchema },
    relacion: String,
    diaseleccionados: String,
    fechaVacunacion: Date,
    idPrestacionVacuna: Types.ObjectId,
    morbilidades: [String],
    fechaValidacion: Date,
    localidadDeclarada: String,
});

InscripcionVacunaSchema.index({
    'paciente.id': 1
});
InscripcionVacunaSchema.index({
    fechaRegistro: 1
});
InscripcionVacunaSchema.index({
    documento: 1,
    sexo: 1
});

export const InscripcionVacuna = model('inscripcion-vacuna', InscripcionVacunaSchema, 'inscripcion-vacunas');

