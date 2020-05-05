import * as mongoose from 'mongoose';
import * as constantes from '../../../core/mpi/schemas/constantes';
import * as direccionSchema from '../../../core/tm/schemas/direccion';
import { NombreApellidoSchema } from '../../../core/tm/schemas/nombreApellido';
let asistenciaSocialSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.ObjectId,
    paciente: {
        fechaAutodiagnostico: {
            type: Date,
            es_indexed: true
        },
        documento: {
            type: String,
            es_indexed: true
        },
        sexo: constantes.SEXO,
        fechaIngreso: Date,
        domicilioResidencia: [direccionSchema],
        domicilioCuarentena: [direccionSchema],
        hotel: String,
        comparteVivienda: [String],
        datosViviend: [String]
    },
    profesional: NombreApellidoSchema    
});

export let asistenciaSocial = mongoose.model('asistenciaSocial', asistenciaSocialSchema, 'asistenciaSocial');
