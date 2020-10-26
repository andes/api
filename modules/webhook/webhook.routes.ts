import { WebHook } from './webhook.schema';
import { MongoQuery, ResourceBase } from '@andes/core';

class WebhookResource extends ResourceBase {
    Model = WebHook;
    resourceName = 'webhook';
    keyId = '_id';
    searchFileds = {
        nombre: MongoQuery.partialString,
        search: ['nombre']
    };
}

export const WebhookCtr = new WebhookResource({});
export const WebhookRouter = WebhookCtr.makeRoutes();
