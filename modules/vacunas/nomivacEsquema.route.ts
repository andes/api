import { MongoQuery, ResourceBase } from '@andes/core';
import * as mongoose from 'mongoose';
import { nomivacEsquema } from './schemas/nomivacEsquema.schema';
import { Auth } from '../../auth/auth.class';

class NomivacEsquemaResource extends ResourceBase {
    Model = nomivacEsquema;
    resourceName = 'nomivacEsquemas';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        codigo: MongoQuery.equalMatch,
        habilitado: MongoQuery.equalMatch,
        nombre: MongoQuery.partialString,
        vacuna: {
            field: 'vacuna._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
        condicion: {
            field: 'condicion._id',
            fn: (value) => mongoose.Types.ObjectId(value)
        }
    };
}

export const nomivacEsquemaCtr = new NomivacEsquemaResource({});
export const nomivacEsquemaRouter = nomivacEsquemaCtr.makeRoutes();
