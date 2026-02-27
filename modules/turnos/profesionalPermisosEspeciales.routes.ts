import { MongoQuery, ResourceBase, SearchFieldsType } from '@andes/core';
import { ProfesionalPermisosEspeciales } from './profesionaPermisosEspeciales.schema';
import { Auth } from '../../auth/auth.class';
import moment = require('moment');

class ProfesionalPermisosEspecialesResource extends ResourceBase {
    Model = ProfesionalPermisosEspeciales;
    resourceName = 'profesionalPermisosEspeciales';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        profesional: {
            field: 'profesional._id',
            fn: MongoQuery.equalMatch
        },
        horaInicio: {
            field: 'horaInicio',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        horaFin: {
            field: 'horaFin',
            fn: (value) => (MongoQuery.matchDate(value))
        },
        prestacion: {
            field: 'prestacion',
            fn: MongoQuery.equalMatch
        },
        desde: {
            field: 'horaInicio',
            fn: (value) => {
                return { $gte: value };
            }
        },
        hasta: {
            field: 'horaFin',
            fn: (value) => {
                return { $lte: value };
            }
        }
    };
}

export const ProfesionalPermisosEspecialesCtr = new ProfesionalPermisosEspecialesResource({});
export const ProfesionalPermisosEspecialesRouter = ProfesionalPermisosEspecialesCtr.makeRoutes();
