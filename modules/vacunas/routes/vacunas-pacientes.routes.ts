import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { VacunasPacientes } from '../schemas/vacunas-pacientes.schema';

class VacunasPacientesResource extends ResourceBase {
    Model = VacunasPacientes;
    middlewares = [Auth.authenticate()];
    resourceName = 'vacunasPacientes';
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        vacuna: {
            field: 'aplicaciones.vacuna.id',
            fn: MongoQuery.equalMatch
        }
    };
}

export const VacunasPacientesCtr = new VacunasPacientesResource();
export const VacunasPacientesRouter = VacunasPacientesCtr.makeRoutes();
