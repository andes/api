import { MongoQuery, ResourceBase } from '@andes/core';
import { MotivosHuds } from './motivosHuds.schema';

class MotivosHudsResource extends ResourceBase {
    Model = MotivosHuds;
    resourceName = 'motivosHuds';
    searchFileds = {
        motivo: MongoQuery.partialString,
        descripcion: MongoQuery.partialString,
        moduloDefault: MongoQuery.partialString,
        search: ['motivo', 'moduloDefault']
    };
}
export const MotivosHudsCtr = new MotivosHudsResource({});
export const MotivosHudsRouter = MotivosHudsCtr.makeRoutes();
