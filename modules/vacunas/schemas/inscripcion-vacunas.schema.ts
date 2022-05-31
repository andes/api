
import { AndesDocWithAudit, AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ITokenSearch, TokenSearch } from '@andes/mongoose-token-search';
import { model, Schema, SchemaTypes, Types } from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import { IVacunasInscripcion } from '../inscripcion-vacunas.interface';
import { PacienteSubSchema } from '../../../core-v2/mpi/paciente/paciente.schema';

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
        enum: ['pendiente', 'habilitado', 'inhabilitado', 'fallecido', 'noCompletaEsquema']
    },
    validado: Boolean,
    personal_salud: Boolean,
    validaciones: [String],
    paciente: PacienteSubSchema,
    nota: String,
    cud: String,
    alergia: Boolean,
    condicion: Boolean,
    enfermedad: Boolean,
    convaleciente: Boolean,
    aislamiento: Boolean,
    vacuna: Boolean,
    plasma: Boolean,
    profesion: String,
    matricula: String,
    establecimiento: String,
    localidadEstablecimiento: { type: nombreSchema },
    relacion: String,
    diaseleccionados: String,
    fechaVacunacion: Date,
    idPrestacionVacuna: Types.ObjectId,
    morbilidades: [String],
    factorRiesgoEdad: Boolean,
    fechaValidacion: Date,
    localidadDeclarada: String,
    fechaCertificado: Date,
    idPrestacionCertificado: Types.ObjectId,
    fechaProximoLlamado: Date,
    asignado: {
        fechaAsignacion: Date,
        usuario: {
            id: Types.ObjectId,
            nombreCompleto: String,
            nombre: String,
            apellido: String,
            username: String,
            documento: String
        }
    },
    turno: {
        organizacion: {
            id: Types.ObjectId,
            nombre: String
        },
        fechaYHora: Date
    },
    llamados: [{
        numeroIntento: Number,
        fechaRealizacion: Date,
        usuario: SchemaTypes.Mixed
    }],
    numeroIdentificacion: String
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

