
import { MongoQuery, ResourceBase } from '@andes/core';
import { Disclaimer } from '../schemas/disclaimer';

class DisclaimerResource extends ResourceBase {
    Model = Disclaimer;
    resourceName = 'disclaimer';
    keyId = '_id';
    searchFileds = {
        activo: MongoQuery.matchString,
        version: MongoQuery.partialString,
        search: (value) => {
            return {
                $or: [
                    {
                        version: MongoQuery.partialString(value)
                    }
                ]
            };
        }
    };
}
export const DisclaimerCtr = new DisclaimerResource({});
module.exports = DisclaimerCtr.makeRoutes();
