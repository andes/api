import { MongoQuery, ResourceBase } from '@andes/core';
import { AreaProgramaProvincial } from './schemas/areaProgramaProvincial';

class AreaProgramaProvincialResource extends ResourceBase {
    Model = AreaProgramaProvincial;
    resourceName = 'areaProgramaProvincial';
    searchFileds = {
        nombre: MongoQuery.partialString,
        idLocalidad: MongoQuery.equalMatch
    };
}

export const AreaProgramaProvincialCtr = new AreaProgramaProvincialResource();
export const AreaProgramaProvincialRouter = AreaProgramaProvincialCtr.makeRoutes();
