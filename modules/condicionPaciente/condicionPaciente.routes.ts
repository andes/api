
import { CondicionPaciente } from './condicionPaciente.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class CondicionPacienteResource extends ResourceBase {
    Model = CondicionPaciente;
    resourceName = 'condicionesPaciente';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        activo: MongoQuery.equalMatch,
        conceptoId: {
            field: 'tipoPrestacion.conceptId',
            fn: MongoQuery.equalMatch
        },
        term: {
            field: 'tipoPrestacion.term',
            fn: MongoQuery.partialString
        },
    };
}

export const CondicionPacienteCtr = new CondicionPacienteResource({});
export const CondicionPacienteRouter = CondicionPacienteCtr.makeRoutes();
