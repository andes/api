import { MongoQuery, ResourceBase } from '@andes/core';
import { Farmacia, IFarmaciaDoc } from './schemas/farmacia';
import { EventCore } from '@andes/event-bus/';
import { Auth } from '../../auth/auth.class';

class FarmaciasResourse extends ResourceBase<IFarmaciaDoc> {
    Model = Farmacia;
    resourceName = 'farmacias';
    resourceModule = 'farmacia';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        denominacion: MongoQuery.partialString,
        razonSocial: MongoQuery.partialString,
        cuit: MongoQuery.partialString,
        DTResponsable: MongoQuery.partialString,
        matriculaDTResponsable: MongoQuery.equalMatch,
        disposicionAltaDT: MongoQuery.equalMatch,
        asociadoA: MongoQuery.equalMatch,
        disposicionHabilitacion: MongoQuery.equalMatch
    };
    eventBus = EventCore;
}

export const FarmaciasCtr = new FarmaciasResourse({});
export const FarmaciasRouter = FarmaciasCtr.makeRoutes();
