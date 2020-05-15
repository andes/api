import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { SeguimientoPaciente } from './seguimiento-paciente.schema';
import { Types } from 'mongoose';

class SeguimientoPacienteResource extends ResourceBase {
    Model = SeguimientoPaciente;
    resourceName = 'seguimiento-paciente';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: (value) => Types.ObjectId(value)
        },
        profesional: {
            field: 'profesional._id',
            fn: (value) => Types.ObjectId(value)
        },
        fechaDesde: {
            field: 'fechaDiagnostico',
            fn: (value) => { return { $gte: value }; }
        },
        fechaHasta: {
            field: 'fechaDiagnostico',
            fn: (value) => { return { $lte: value }; }
        }
    };
    routesAuthorization = {
        get: Auth.authorize('log:get'),
        post: Auth.authorize('log:post'),
    };
}

export const SeguimientoPacienteCtr = new SeguimientoPacienteResource({});
export const SeguimientoPacienteRouter = SeguimientoPacienteCtr.makeRoutes();
