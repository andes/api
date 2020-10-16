import { MongoQuery } from '@andes/core';
import { ResourceBase } from '@andes/core';
import { WebHookLog } from './webhooklog.schema';

class WebhookLogResource extends ResourceBase {
    Model = WebHookLog;
    resourceName = 'log';
    keyId = '_id';

    searchFileds = {
        url: MongoQuery.partialString,
        event: MongoQuery.partialString,
        fecha: {
            field: 'updatedAt',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        search: ['url', 'event']
    };
}

export const WebhookLogCtr = new WebhookLogResource({});

export const WebhookLogRouter = WebhookLogCtr.makeRoutes();
