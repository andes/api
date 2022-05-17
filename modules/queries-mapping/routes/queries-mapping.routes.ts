import { MongoQuery, ResourceBase } from '@andes/core';
import { QueriesMapping } from '../schemas/queries-mapping.schema';

class QueriesMappingResource extends ResourceBase {
    Model = QueriesMapping;
    resourceName = 'queries-mapping';
    searchFileds = {
        source: MongoQuery.partialString
    };
}

export const QueriesMappingCtr = new QueriesMappingResource({});
export const QueriesMappingRouter = QueriesMappingCtr.makeRoutes();
