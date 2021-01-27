import { MongoQuery, ResourceBase } from '@andes/core';
import * as mongoose from 'mongoose';
import { Auth } from '../../auth/auth.class';
import { nomivacLotes } from './schemas/nomivacLote.schema';

class NomivacLotesResource extends ResourceBase {
    Model = nomivacLotes;
    resourceName = 'nomivacLotes';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        vacuna: {
            field: 'vacuna._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
    };
}

export const nomivacLoteCtr = new NomivacLotesResource({});
export const nomivacLoteRouter = nomivacLoteCtr.makeRoutes();
