import { MongoQuery, ResourceBase } from '@andes/core';
import { MotivosHuds } from './motivosHuds.schema';

class MotivosHudsResource extends ResourceBase {
    Model = MotivosHuds;
    resourceName = 'motivosHuds';
    defaultParams = { activo: true };
    searchFileds = {
        label: MongoQuery.partialString,
        key: MongoQuery.partialString,
        descripcion: MongoQuery.partialString,
        moduloDefault: MongoQuery.partialString,
        labelPaciente: MongoQuery.partialString,
        activo: MongoQuery.equalMatch
    };
}

export const MotivosHudsCtr = new MotivosHudsResource({});
export const MotivosHudsRouter = MotivosHudsCtr.makeRoutes();
