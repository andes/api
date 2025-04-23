import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../auth/auth.class';
import { RecetaDispositivo } from './receta-dispositivo.schema';

class RecetaDispositivoResource extends ResourceBase {
    Model = RecetaDispositivo;
    resourceName = 'recetaDispositivo';
    routesEnable = ['get, post'];
    middlewares = [Auth.authenticate()];
    searchFileds = {
        paciente: {
            field: 'paciente.id',
            fn: MongoQuery.equalMatch
        },
        documento: {
            field: 'paciente.documento',
            fn: MongoQuery.equalMatch
        }
    };
}

export const RecetaDispositivoCtr = new RecetaDispositivoResource({});
export const RecetaDispositivoRouter = RecetaDispositivoCtr.makeRoutes();
