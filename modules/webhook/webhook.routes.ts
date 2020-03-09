import { WebHook } from './webhook.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class WebhookResource extends ResourceBase {
    Model = WebHook;
    resourceName = 'webhook';
    keyId = '_id';
    searchFileds = {
        nombre: MongoQuery.partialString,
        search: (value) => {
            return {
                nombre: MongoQuery.partialString(value)
            };
        },
    };
}

export const WebhookCtr = new WebhookResource({});
export const WebhookRouter = WebhookCtr.makeRoutes();
