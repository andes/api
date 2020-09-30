
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { ServicioIntermedio } from './schemas/servicio-intermedio.schema';

class ServicioIntermedioResource extends ResourceBase {
    Model = ServicioIntermedio;
    resourceName = 'servicios-intermedio';
    searchFileds = {
        search: ['nombre'],
        nombre: MongoQuery.equalMatch,
        ids: MongoQuery.inArray.withField('_id')
    };
    middlewares = [Auth.authenticate()];

    async getConceptosFromIds(ids: string[]) {
        const serviciosObj = await ServicionIntermedioCtr.search({ ids });
        const conceptos = serviciosObj.reduce((acc, current) => [...acc, ...current.tipoPrestacion], []);
        return conceptos;
    }
}
export const ServicionIntermedioCtr = new ServicioIntermedioResource();
export const ServicionIntermedioRouter = ServicionIntermedioCtr.makeRoutes();
