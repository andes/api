import { MongoQuery} from '@andes/core';
import { ResourceBase } from '@andes/core';
import { WebHookLog } from './webhooklog.schema';

class WebhookLogResource extends ResourceBase {
    Model = WebHookLog;
    resourceName = 'webhooklogs';
    keyId = '_id';

    searchFileds = {
        url: MongoQuery.partialString,
        event: MongoQuery.partialString,
        fechaInicio: {
            field: 'updatedAt',
            fn: (value, params) => (MongoQuery.matchDate(new Date(value)))
        },
        search: (s) => {    
        let res =
            { $or: [
                { url: MongoQuery.partialString(s) },
                { event: MongoQuery.partialString(s) }
            ]};
        return res;
        }
    };
}

export const WebhookLogCtr = new WebhookLogResource({});

export const WebhookLogRouter = WebhookLogCtr.makeRoutes();
