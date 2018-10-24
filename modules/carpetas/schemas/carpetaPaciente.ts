import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

const carpetaPacienteSchema = new mongoose.Schema({
    documento: String,
    carpetaEfectores: [{
        organizacion: nombreSchema,
        idPaciente: String,
        nroCarpeta: String
    }]
});

const carpetaPaciente = mongoose.model('carpetaPaciente', carpetaPacienteSchema, 'carpetaPaciente');
export = carpetaPaciente;
