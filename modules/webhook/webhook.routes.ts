import { WebHook } from './webhook.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class WebhookResource extends ResourceBase {
    Model = WebHook;
    resourceName = 'webhook';
    keyId = '_id';
    searchFileds = {
        name: MongoQuery.partialString,
        search: (value) => {
            return {
                name: MongoQuery.partialString(value)
            };
        },
    };
}

export const WebhookCtr = new WebhookResource({});
export const WebhookRouter = WebhookCtr.makeRoutes();
