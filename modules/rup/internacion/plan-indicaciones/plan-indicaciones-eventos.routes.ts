import { MongoQuery, ResourceBase } from '@andes/core';
import { EventCore } from '@andes/event-bus/index';
import { Auth } from '../../../../auth/auth.class';
import { PlanIndicacionesEventos } from './plan-indicaciones.schema';

class PlanIndicacionesEventosController extends ResourceBase {
    Model = PlanIndicacionesEventos;
    resourceName = 'plan-indicaciones-eventos';
    resourceModule = 'internacion';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.matchDate,
        internacion: MongoQuery.equalMatch.withField('idInternacion'),
        prestacion: MongoQuery.equalMatch.withField('idPrestacion'),
        indicacion: MongoQuery.equalMatch.withField('idIndicacion'),
        estado: MongoQuery.equalMatch
    };
    eventBus = EventCore;

    async deleteByIndicacion(idIndicacion: String, desde?: Date, estado?: String) {
        const query = PlanIndicacionesEventos.deleteMany({ idIndicacion });
        if (desde) {
            query.where({ fecha: { $gte: desde } });
        }
        if (estado) {
            query.where({ estado });
        }
        await query;
    }
}

export const PlanIndicacionesEventosCtr = new PlanIndicacionesEventosController({});
export const PlanIndicacionesEventosRouter = PlanIndicacionesEventosCtr.makeRoutes();
