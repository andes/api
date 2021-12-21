import { model, Schema } from 'mongoose';
import { ObraSocialSchema } from '../../../modules/obraSocial/schemas/obraSocial';

export const PacientesEmpadronadosSchema = new Schema(
    {
        documento: String,
        sexo: String,
        genero: String,
        nombre: String,
        apellido: String,
        fechaNacimiento: Date,
        fechaEmpadronamiento: Date,
        codigoSisaEmpadronamiento: String,
        financiador: { type: ObraSocialSchema },
        pais: String,
        createdAt: Date
    });

export const PacientesEmpadronados = model('pacientes-empadronados', PacientesEmpadronadosSchema, 'pacientes-empadronados');
