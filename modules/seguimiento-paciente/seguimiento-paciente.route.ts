import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { SeguimientoPaciente } from './schemas/seguimiento-paciente.schema';

class SeguimientoPacienteResource extends ResourceBase {
    Model = SeguimientoPaciente;
    resourceName = 'seguimientoPaciente';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fechaInicio: MongoQuery.matchDate.withField('fechaInicio'),
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.id': MongoQuery.equalMatch(value) },
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) }
                ]
            };
        },
        origen: (value) => {
            return {
                $or: [
                    { 'origen.nombre': MongoQuery.partialString(value) },
                    { 'origen.tipo': MongoQuery.partialString(value) },
                    { 'origen.id ': MongoQuery.equalMatch(value) }
                ]
            };
        }
    };
}

export const SeguimientoPacienteCtr = new SeguimientoPacienteResource({});
export const SeguimientoPacienteRouter = SeguimientoPacienteCtr.makeRoutes();
