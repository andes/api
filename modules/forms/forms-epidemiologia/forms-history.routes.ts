import { MongoQuery, ResourceBase } from '@andes/core';
import { FormsHistory } from './forms-history.schema';
import { Auth } from '../../../auth/auth.class';

class FormsHistoryResource extends ResourceBase {
    Model = FormsHistory;
    resourceName = 'formsHistory';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        idFicha: {
            field: 'ficha._id',
            fn: MongoQuery.equalMatch
        },
    };
}

export const FormHistoryCtr = new FormsHistoryResource();
export const FormHistoryRouter = FormHistoryCtr.makeRoutes();
