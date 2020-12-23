import { Auth } from '../../auth/auth.class';
import { MongoQuery, ResourceBase } from '@andes/core';
import { nomivacLaboratorio } from './schemas/nomivacLaboratorios.schema';

class NomivacLaboratorioResource extends ResourceBase {
    Model = nomivacLaboratorio;
    resourceName = 'nomivacLaboratorios';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString
    };
}

export const nomivacLaboratorioCtr = new NomivacLaboratorioResource({});
export const nomivacLaboratorioRouter = nomivacLaboratorioCtr.makeRoutes();
