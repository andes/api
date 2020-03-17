import { RoboModel } from '../../utils/roboSender/roboSchema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';

class SendMessageCacheResource extends ResourceBase {
    Model = RoboModel;
    resourceName = 'sendMessageCache';
    keyId = '_id';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        email: MongoQuery.partialString,
        phone: MongoQuery.partialString,
        search: (value) => {
            return {
                $or: [
                    { email: MongoQuery.partialString(value) },
                    { phone: MongoQuery.partialString(value) }
                ]
            };
        }
    };
}

export const SendMessageCacheCtr = new SendMessageCacheResource({});
export const SendMessageCacheRouter = SendMessageCacheCtr.makeRoutes();
