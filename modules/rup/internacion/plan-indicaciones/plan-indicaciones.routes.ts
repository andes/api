import { asyncHandler } from '@andes/api-tool';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Auth } from '../../../../auth/auth.class';
import { IPlanIndicacionesDoc, PlanIndicaciones } from './plan-indicaciones.schema';
import { EventCore } from '@andes/event-bus/';
import * as moment from 'moment';
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
        registro: MongoQuery.equalMatch.withField('idRegistro'),
        rangoFechas: (fecha: Date) => {
            return {
                $or: [
                    { fechaInicio: { $gte: moment(fecha).startOf('day').toDate() } },
                    { fechaInicio: { $lte: moment(fecha).endOf('day').add(1, 'd').toDate() } }
                ]
            };
        }
    };
    eventBus = EventCore;
}

export const PlanIndicacionesCtr = new PlanIndicacionesController({});
export const PlanIndicacionesRouter = PlanIndicacionesCtr.makeRoutes();


PlanIndicacionesRouter.patch('/plan-indicaciones/:id/estado', asyncHandler(async (req, res) => {
    const indicacion = await PlanIndicacionesCtr.findById(req.params.id);
    if (indicacion) {
        const estado = req.body;
        if (estado.verificacion) {
            indicacion.estados[indicacion.estados.length - 1] = req.body;
        } else {
            indicacion.estados.push(estado);
        }
        Auth.audit(indicacion, req);
        const indicacionUpdated = await indicacion.save();
        EventCore.emitAsync('internacion:plan-indicaciones:update', indicacionUpdated);
        return res.json(indicacionUpdated);
    }
    throw new ResourceNotFound();
}));

