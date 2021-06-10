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
        },
        estado: {
            field: 'ultimoEstado.clave',
            fn: MongoQuery.partialString
        },
    };
}

export const SeguimientoPacienteCtr = new SeguimientoPacienteResource({});
export const SeguimientoPacienteRouter = SeguimientoPacienteCtr.makeRoutes();
