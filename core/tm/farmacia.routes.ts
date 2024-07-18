import { MongoQuery, ResourceBase } from '@andes/core';
import { Farmacia, IFarmaciaDoc } from './schemas/farmacia';
import { Auth } from '../../auth/auth.class';

class FarmaciasResourse extends ResourceBase<IFarmaciaDoc> {
    Model = Farmacia;
    resourceName = 'farmacias';
    resourceModule = 'farmacia';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        denominacion: MongoQuery.partialString,
        razonSocial: MongoQuery.partialString,
        cuit: MongoQuery.equalMatch,
        DTResponsable: MongoQuery.partialString,
        matriculaDTResponsable: MongoQuery.equalMatch,
        disposicionAltaDT: MongoQuery.equalMatch,
    };
}

export const FarmaciasCtr = new FarmaciasResourse({});
export const FarmaciasRouter = FarmaciasCtr.makeRoutes();
