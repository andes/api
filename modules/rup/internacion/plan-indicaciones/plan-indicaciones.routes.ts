import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Auth } from '../../../../auth/auth.class';
import { IPlanIndicacionesDoc, PlanIndicaciones } from './plan-indicaciones.schema';

class PlanIndicacionesController extends ResourceBase<IPlanIndicacionesDoc> {
    Model = PlanIndicaciones;
    resourceName = 'plan-indicaciones';
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


}

export const PlanIndicaionesCtr = new PlanIndicacionesController({});
export const PlanIndicacionesRouter = PlanIndicaionesCtr.makeRoutes();

PlanIndicacionesRouter.patch('/plan-indicaciones/:id/estado', asyncHandler(async (req, res) => {
    const indicacion = await PlanIndicaionesCtr.findById(req.params.id);
    if (indicacion) {
        const estado = req.body;
        indicacion.estados.push(estado);
        Auth.audit(indicacion, req);
        await indicacion.save();
        return res.json(indicacion);
    }
    throw new ResourceNotFound();
}));
