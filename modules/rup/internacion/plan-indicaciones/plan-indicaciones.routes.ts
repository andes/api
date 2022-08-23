import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Auth } from '../../../../auth/auth.class';
import { IPlanIndicacionesDoc, PlanIndicaciones } from './plan-indicaciones.schema';
import { EventCore } from '@andes/event-bus/';
class PlanIndicacionesController extends ResourceBase<IPlanIndicacionesDoc> {
    Model = PlanIndicaciones;
    resourceName = 'plan-indicaciones';
    resourceModule = 'internacion';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        organizacion: {
            field: 'organizacion.id',
            fn: MongoQuery.matchString
        },
        fechaInicio: MongoQuery.matchDate,
        fechaBaja: MongoQuery.matchDate,
        internacion: MongoQuery.equalMatch.withField('idInternacion'),
        prestacion: MongoQuery.equalMatch.withField('idPrestacion'),
        registro: MongoQuery.equalMatch.withField('idRegistro')
    };
    eventBus = EventCore;
}

export const PlanIndicacionesCtr = new PlanIndicacionesController({});
export const PlanIndicacionesRouter = PlanIndicacionesCtr.makeRoutes();


PlanIndicacionesRouter.patch('/plan-indicaciones/:id/estado', asyncHandler(async (req, res) => {
    const indicacion = await PlanIndicacionesCtr.findById(req.params.id);
    if (indicacion) {
        const estado = req.body;
        indicacion.estados.push(estado);
        Auth.audit(indicacion, req);
        const indicacionUpdated = await indicacion.save();
        EventCore.emitAsync('internacion:plan-indicaciones:update', indicacionUpdated);
        return res.json(indicacion);
    }
    throw new ResourceNotFound();
}));

