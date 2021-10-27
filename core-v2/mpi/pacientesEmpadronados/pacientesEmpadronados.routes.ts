
import { ResourceBase, MongoQuery } from '@andes/core';
import { PacientesEmpadronados } from './pacientesEmpadronados.schema';

class PacientesEmpadronadosResource extends ResourceBase {
    Model = PacientesEmpadronados;
    resourceName = 'pacientes-empadronados';
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        }
    };
}

export const PacientesEmpadronadosCtr = new PacientesEmpadronadosResource({});
export const PacientesEmpadronadosRouter = PacientesEmpadronadosCtr.makeRoutes();
