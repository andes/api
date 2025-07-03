import { AuditPlugin } from '@andes/mongoose-plugin-audit';
import * as mongoose from 'mongoose';
import { PacienteSubSchema } from '../../core-v2/mpi/paciente/paciente.schema';
import { SnomedConcept } from '../rup/schemas/snomed-concept';
import { estadosSchema, estadoDispensaSchema, sistemaSchema } from './receta.schema';


const dispositivoSchema = new mongoose.Schema({
    concepto: SnomedConcept,
    cantidad: Number,
    tratamientoProlongado: Boolean,
    tiempoTratamiento: mongoose.SchemaTypes.Mixed
});

export const recetaDispositivoSchema = new mongoose.Schema({
    organizacion: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String
    },
    profesional: {
        id: mongoose.SchemaTypes.ObjectId,
        nombre: String,
        apellido: String,
        documento: String,
        profesion: String,
        matricula: Number,
        especialidad: String,
    },
    fechaRegistro: Date,
    fechaPrestacion: Date,
    idPrestacion: String,
    idRegistro: String,
    diagnostico: SnomedConcept,
    dispositivo: dispositivoSchema,
    dispensa: [
        {
            idDispensaApp: String,
            fecha: Date,
            dispositivo: [{
                cantidad: Number,
                descripcion: String,
                dispositivo: mongoose.SchemaTypes.Mixed,
                cantidadEnvases: Number,
                observacion: {
                    type: String,
                    required: false
                }
            }],
            organizacion: {
                id: String,
                nombre: String
            },
        }
    ],
    estados: [estadosSchema],
    estadoActual: estadosSchema,
    estadosDispensa: [estadoDispensaSchema],
    estadoDispensaActual: estadoDispensaSchema,
    paciente: PacienteSubSchema,
    renovacion: String,
    appNotificada: [{ app: sistemaSchema, fecha: Date }],
    origenExterno: {
        id: String, // id receta creada por sistema que no es Andes
        app: sistemaSchema,
        fecha: Date
    }
});

recetaDispositivoSchema.pre('save', function (next) {
    const recetaDispositivo: any = this;

    if (recetaDispositivo.estados && recetaDispositivo.estados.length > 0) {
        recetaDispositivo.estadoActual = recetaDispositivo.estados[recetaDispositivo.estados.length - 1];
    }
    if (recetaDispositivo.estadosDispensa && recetaDispositivo.estadosDispensa.length > 0) {
        recetaDispositivo.estadoDispensaActual = recetaDispositivo.estadosDispensa[recetaDispositivo.estadosDispensa.length - 1];
    }

    next();
});

recetaDispositivoSchema.plugin(AuditPlugin);

recetaDispositivoSchema.index({
    idPrestacion: 1,
});

export const RecetaDispositivo = mongoose.model('prescripcionInsumos', recetaDispositivoSchema, 'prescripcionInsumos');
