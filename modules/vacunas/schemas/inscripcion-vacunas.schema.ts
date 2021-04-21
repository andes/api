
import { Schema, Types, model } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { AuditPlugin, AndesDocWithAudit } from '@andes/mongoose-plugin-audit';
import { ITokenSearch, TokenSearch } from '@andes/mongoose-token-search';
import { IVacunasInscripcion } from '../inscripcion-vacunas.interface';

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
        nombre: String,
        apellido: String,
        documento: String,
        telefono: String,
        sexo: String,
        fechaNacimiento: Date,
        addAt: Date
    },
    nota: String,
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
    fechaCertificado: Date,
    idPrestacionCertificado: Types.ObjectId
});

InscripcionVacunaSchema.plugin(AuditPlugin);
InscripcionVacunaSchema.plugin(TokenSearch(['documento', 'nombre', 'apellido']));
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

export type IVacunasInscripcionDoc = AndesDocWithAudit<IVacunasInscripcion>;

export const InscripcionVacuna = model<IVacunasInscripcionDoc, ITokenSearch<IVacunasInscripcionDoc>>('inscripcion-vacuna', InscripcionVacunaSchema, 'inscripcion-vacunas');

