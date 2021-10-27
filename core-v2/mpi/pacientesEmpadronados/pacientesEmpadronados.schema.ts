import { ObraSocialSchema } from '../../../modules/obraSocial/schemas/obraSocial';
import { model, Schema } from 'mongoose';

export const PacientesEmpadronadosSchema = new Schema(
    {
        documento: String,
        sexo: String,
        genero: String,
        nombre: String,
        apellido: String,
        fechaNacimiento: Date,
        fechaEmpadronamiento: String,
        codigoSisaEmpadronamiento: String,
        financiador: { type: ObraSocialSchema },
        pais: String
    });

export const PacientesEmpadronados = model('pacientes-empadronados', PacientesEmpadronadosSchema, 'pacientes-empadronados');
