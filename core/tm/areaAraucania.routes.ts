import { ResourceBase } from '@andes/core';
import { AreaAraucania } from './schemas/areaAraucania';

class AreaAraucaniaResource extends ResourceBase {
    Model = AreaAraucania;
    resourceName = 'areaAraucania';
    keyId = '_id';
}
export const AreaAraucaniaCtr = new AreaAraucaniaResource({});
export const AreaAraucaniaRouter = AreaAraucaniaCtr.makeRoutes();
