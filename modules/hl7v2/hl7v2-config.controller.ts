import { MongoQuery, ObjectId, ResourceBase } from '@andes/core';
import { IHL7v2Config, HL7v2Config } from './hl7v2-config.schema';

export class Hl7ConfigCtr extends ResourceBase {
    Model = HL7v2Config;
    resourceName = 'hl7v2-config';
    middlewares = [];
    searchFields = {
        organizacion: MongoQuery.equalMatch.withField('organizacion.id'),
        tipoPrestacion: MongoQuery.equalMatch.withField('tipoPrestacion.conceptId')
    };

    async getConfig(organizacion: ObjectId, tipoPrestacion: string, tipoMensaje: string): Promise<IHL7v2Config> {
        const config = await this.findOne({
            organizacion,
            tipoPrestacion,
            tipoMensaje
        });
        return config;
    }
}

export const Hl7ConfigController = new Hl7ConfigCtr();
export const Hl7ConfigRoutes = Hl7ConfigController.makeRoutes();
