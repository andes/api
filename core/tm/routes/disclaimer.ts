
import { MongoQuery, ResourceBase } from '@andes/core';
import { Disclaimer } from '../schemas/disclaimer';

class DisclaimerResource extends ResourceBase {
    Model = Disclaimer;
    resourceName = 'disclaimer';
    keyId = '_id';
    searchFileds = {
        activo: MongoQuery.matchString,
        version: MongoQuery.partialString
    };
}
export const DisclaimerCtr = new DisclaimerResource({});
module.exports = DisclaimerCtr.makeRoutes();
