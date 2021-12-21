
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { PacientesEmpadronados } from './pacientes-empadronados.schema';

class PacientesEmpadronadosResource extends ResourceBase {
    Model = PacientesEmpadronados;
    resourceName = 'pacientes-empadronados';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        }
    };
}

export const PacientesEmpadronadosCtr = new PacientesEmpadronadosResource({});
export const PacientesEmpadronadosRouter = PacientesEmpadronadosCtr.makeRoutes();
