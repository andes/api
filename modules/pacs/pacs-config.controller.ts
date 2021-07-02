import { MongoQuery, ObjectId, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { IPacsConfig, PacsConfig } from './pacs-config.schema';

export class PacsConfigCtr extends ResourceBase {
    Model = PacsConfig;
    resourceName = 'pacs-config';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: MongoQuery.equalMatch.withField('organizacion.id'),
        tipoPrestacion: MongoQuery.equalMatch.withField('tipoPrestacion.conceptId')
    };

    async getConfig(organizacion: ObjectId, tipoPrestacion: string): Promise<IPacsConfig> {
        const config = await this.findOne({
            organizacion,
            tipoPrestacion
        });
        return config;
    }
}

export const PacsConfigController = new PacsConfigCtr();
export const PacsConfigRoutes = PacsConfigController.makeRoutes();
