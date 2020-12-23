import { MongoQuery, ResourceBase } from '@andes/core';
import * as mongoose from 'mongoose';
import { nomivacDosis } from './schemas/nomivacDosis.schema';
import { Auth } from '../../auth/auth.class';

class NomivacDosisResource extends ResourceBase {
    Model = nomivacDosis;
    resourceName = 'nomivacDosis';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        vacuna: {
            field: 'vacuna._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
        esquema: {
            field: 'esquema._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        }
    };
}

export const nomivacDosisCtr = new NomivacDosisResource({});
export const nomivacDosisRouter = nomivacDosisCtr.makeRoutes();
