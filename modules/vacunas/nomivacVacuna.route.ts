import { MongoQuery, ResourceBase } from '@andes/core';
import { nomivacVacunas } from './schemas/nomivacVacuna.schema';
import { Auth } from '../../auth/auth.class';

class NomivacVacunaResource extends ResourceBase {
    Model = nomivacVacunas;
    resourceName = 'nomivacVacunas';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        calendarioNacional: MongoQuery.equalMatch
    };
}

export const nomivacVacunaCtr = new NomivacVacunaResource({});
export const nomivacVacunaRouter = nomivacVacunaCtr.makeRoutes();
