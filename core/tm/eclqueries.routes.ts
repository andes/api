import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from './../../auth/auth.class';
import { ECLQueries } from './schemas/eclqueries.schema';

class ECLQueriesController extends ResourceBase {
    Model = ECLQueries;
    resourceName = 'eclqueries';
    middlewares = [Auth.authenticate()];
    routesEnable = ['get', 'search'];
    searchFileds = {
        key: MongoQuery.partialString,
        nombre: MongoQuery.partialString
    };
}

export const ECLQueriesCtr = new ECLQueriesController({});
export const ECLQueriesRouter = ECLQueriesCtr.makeRoutes();
