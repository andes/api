import * as mongoose from 'mongoose';
import * as nombreApellidoSchema from '../../../core/tm/schemas/nombreApellido';
import { pacienteSchema } from '../../../core/mpi/schemas/paciente';
import { tipoPrestacionSchema } from '../../../core/tm/schemas/tipoPrestacion';
import { espacioFisicoSchema } from '../../../modules/turnos/schemas/espacioFisico';
import * as nombreSchema from '../../../core/tm/schemas/nombre';
import * as constantes from './constantes';


const solicitudCarpetaManualSchema = new mongoose.Schema({
    fecha: Date,
    paciente: pacienteSchema,
    numero: String,
    estado: {
        type: String,
        enum: [constantes.EstadoSolicitudCarpeta.Pendiente, constantes.EstadoSolicitudCarpeta.Aprobada],
        default: constantes.EstadoSolicitudCarpeta.Pendiente
    },
    organizacion: {
        type: nombreSchema,
        required: true
    },
    datosSolicitudManual: {
        espacioFisico: espacioFisicoSchema,
        prestacion: tipoPrestacionSchema,
        profesional: nombreApellidoSchema,
        responsable: nombreApellidoSchema,
        observaciones: String
    }
});

solicitudCarpetaManualSchema.plugin(require('../../../mongoose/audit'));

const solicitudCarpetaManual = mongoose.model('solicitudCarpetaManual', solicitudCarpetaManualSchema, 'solicitudCarpetaManual');
export = solicitudCarpetaManual;
