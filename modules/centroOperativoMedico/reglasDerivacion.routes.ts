import { ReglasDerivacion } from './schemas/reglasDerivacion.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class ReglasDerivacionResource extends ResourceBase {
    Model = ReglasDerivacion;
    resourceName = 'reglasDerivacion';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        estadoInicial: MongoQuery.equalMatch,
        estadoFinal: MongoQuery.equalMatch,
        soloCOM: MongoQuery.equalMatch
    };
}

export const ReglasDerivacionCtr = new ReglasDerivacionResource({});
export const ReglasDerivacionRouter = ReglasDerivacionCtr.makeRoutes();
