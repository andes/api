import * as mongoose from 'mongoose';
import * as nombreSchema from '../../../core/tm/schemas/nombre';

let carpetaPacienteSchema = new mongoose.Schema({
    documento: String,
    carpetaEfectores: [{
        organizacion: nombreSchema,
        idPaciente: String,
        nroCarpeta: String
    }]
});

let carpetaPaciente = mongoose.model('carpetaPaciente', carpetaPacienteSchema, 'carpetaPaciente');
export = carpetaPaciente;
