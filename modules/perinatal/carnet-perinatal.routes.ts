import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { EventCore } from '@andes/event-bus/';
import { CarnetPerinatal } from './schemas/carnet-perinatal.schema';

class CarnetPerinatalResource extends ResourceBase {
    Model = CarnetPerinatal;
    resourceName = 'carnet-perinatal';
    routesEnable = ['patch', 'get', 'search'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        fecha: MongoQuery.matchDate.withField('fecha'),
        fechaUltimoControl: MongoQuery.matchDate.withField('fechaUltimoControl'),
        fechaProximoControl: MongoQuery.matchDate.withField('fechaProximoControl'),
        paciente: (value) => {
            return {
                $or: [
                    { 'paciente.documento': MongoQuery.partialString(value) },
                    { 'paciente.nombre': MongoQuery.partialString(value) },
                    { 'paciente.apellido': MongoQuery.partialString(value) }
                ]
            };
        },
        organizacion: MongoQuery.matchString.withField('controles.organizacion.nombre'),
        profesional: MongoQuery.matchString.withField('controles.profesional.id'),
    };
    eventBus = EventCore;
}

export const CarnetPerinatalCtr = new CarnetPerinatalResource({});
export const CarnetPerinatalRouter = CarnetPerinatalCtr.makeRoutes();
