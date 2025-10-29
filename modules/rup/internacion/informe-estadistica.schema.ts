import { Schema, model } from 'mongoose';
import { SnomedConcept } from '../schemas/snomed-concept';
import * as OrganizacionSchema from '../../../core/tm/schemas/nombre';
import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import { ProfesionalSubSchema } from '../../../core/tm/schemas/profesional';
import { ObraSocialSchema } from '../../obraSocial/schemas/obraSocial';
import { PacienteSubSchema } from '../../../core-v2/mpi';
import { schema as procQuirurgicosSchema } from '../../../core/tm/schemas/procedimientoQuirurgico';
import { schema as Cie10 } from '../../../core/term/schemas/cie10';
// import { model as OcupacionSchema } from '../../../core/tm/schemas/ocupacion';
import { schema as OcupacionSchema } from '../../../core/tm/schemas/ocupacion';

const InformeIngresoSchema = new Schema({
    fechaIngreso: {
        type: Date,
        required: true
    },
    origen: {
        tipo: String, // Origen hospitalización  enumerado?
        organizacionOrigen: { type: OrganizacionSchema, required: false }, // Organización origen - solo para "traslado"
        otraOrganizacion: { // solo para "traslado"
            type: String,
            required: false
        },
    },
    // datos estadisticos
    ocupacionHabitual: OcupacionSchema,
    situacionLaboral: {
        id: String,
        nombre: String
    },
    nivelInstruccion: {
        id: String,
        nombre: String
    },
    // situacionLaboral: { type: String, required: false },
    // nivelInstruccion: { type: String, required: false },
    especialidades: [SnomedConcept],
    nroCarpeta: String, // evaluar continuidad de este dato
    motivo: String,

    profesional: ProfesionalSubSchema,
    paseAunidadOrganizativa: String, // verificar si se usa
    cobertura: {
        tipo: String, // ver que sea enumerado
        obraSocial: { // Obra social, ver si corresponde
            type: ObraSocialSchema,
            required: false
        },
    }

});

const InformeEgresoSchema = new Schema({
    fechaEgreso: Date,
    nacimientos: [Schema.Types.Mixed], // ver si se usa
    procedimientosQuirurgicos: [
        {
            procedimiento: {
                // revisar no incluye campo  nom: que es una concatenacion de nombre y codigo
                type: procQuirurgicosSchema, requied: false
            },
            fecha: Date,
        }
    ],
    causaExterna: {
        producidaPor: { type: String, required: false },
        lugar: { type: String, required: false },
        comoSeProdujo: { type: String, required: false }
    },
    diasDeEstada: Number,
    tipoEgreso: {
        tipo: String, // ver si pasa a un enumerado: alta, traslado, defuncion
        OrganizacionDestino: OrganizacionSchema,
        otraOrganizacion: { // solo para "traslado" (ex UnidadOrganizativaDestino)
            type: String,
            required: false
        }
    },
    diagnosticos: {
        principal: Cie10, // diagnosticoPrincipal
        secundarios: [Cie10], //  otrosDiagnosticos
        otrasCircunstancias: Cie10,
        diasEstadaOtrasCircunstancias: Number,
        diasDePermisoDeSalida: Number
    }
});

const InternacionEstadoSchema = new Schema({
    tipo: {
        type: String,
        enum: ['anulada', 'ejecucion', 'validada'],
        required: true,
    },
});

export const InformeEstadisticaSchema = new Schema({
    organizacion: {
        type: OrganizacionSchema,
        required: true
    },
    unidadOrganizativa: {
        type: SnomedConcept,
        required: true
    },
    paciente: PacienteSubSchema,
    informeIngreso: {
        type: InformeIngresoSchema,
        required: true
    },
    informeEgreso: {
        type: InformeEgresoSchema,
        required: false
    },
    periodosCensables: [{ desde: Date, hasta: Date }],
    estados: [InternacionEstadoSchema],
    estadoActual: InternacionEstadoSchema,

});

InternacionEstadoSchema.plugin(AuditPlugin);
InformeEstadisticaSchema.plugin(AuditPlugin);
InformeIngresoSchema.plugin(AuditPlugin);
InformeEgresoSchema.plugin(AuditPlugin);

export const InformeEstadistica = model('internacionFormEstadistica', InformeEstadisticaSchema, 'internacionFormEstadistica');
