import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { InformeEstadistica } from './informe-estadistica.schema';

class InformeEstadisticaResource extends ResourceBase {
    Model = InformeEstadistica;
    resourceModule = 'internacion';
    resourceName = 'informe-estadistica';
    keyId = '_id';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        organizacion: {
            field: 'organizacion._id',
            fn: MongoQuery.equalMatch
        },
        // Búsqueda por rango/fecha: pasar field + fn que invoque matchDate
        fechaIngreso: {
            field: 'informeIngreso.fechaIngreso',
            fn: (value) => MongoQuery.matchDate(value)
        },
        fechaEgreso: {
            field: 'informeEgreso.fechaEgreso',
            fn: (value) => MongoQuery.matchDate(value)
        },
        // búsqueda genérica por algunos campos
        search: ['nroCarpeta', 'paciente.apellido', 'paciente.nombre']
    };
}

export const InformeEstadisticaCtr = new InformeEstadisticaResource({});
export const InformeEstadisticaRouter = InformeEstadisticaCtr.makeRoutes();


