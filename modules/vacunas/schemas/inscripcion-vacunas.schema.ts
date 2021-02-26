
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
        type: String,
        required: true,
        enum: ['mayores60', 'personal-salud', 'personal-seguridad', 'docentes', 'otros']
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
    validaciones: ['domicilio'],
    paciente: {
        id: Types.ObjectId,
        addAt: Date,
    },
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
    relacion: String
});

export const InscripcionVacuna = model('inscripcion-vacuna', InscripcionVacunaSchema, 'inscripcion-vacunas');

