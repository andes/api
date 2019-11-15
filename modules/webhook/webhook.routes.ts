import * as mongoose from 'mongoose';
import { WebHook } from './webhookSchema';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';

class WebhookResource extends ResourceBase {
    Model = WebHook;
    resourceName = 'webhook';
    keyId = '_id';
    searchFileds = {
        name: MongoQuery.partialString
    };
}

export const WebhookCtr = new WebhookResource({});
export const WebhookRouter = WebhookCtr.makeRoutes();
