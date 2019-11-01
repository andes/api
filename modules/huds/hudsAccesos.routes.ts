import * as mongoose from 'mongoose';
import { HudsAcceso } from './hudsAccesos.schema';
import { Auth } from '../../auth/auth.class';
import { MongoQuery, ResourceBase, ResourceNotFound } from '@andes/core';
import { Request } from '@andes/api-tool';
import * as utils from '../../utils/utils';

class HudsAccesoResource extends ResourceBase {
    Model = HudsAcceso;
    resourceName = 'huds-accesos';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('log:get'),
        post: Auth.authorize('log:post'),
        patch: Auth.authorize('log:post')
    };
    searchFileds = {
        paciente: {
            field: 'paciente',
            fn: (value) => mongoose.Types.ObjectId(value)
        },
        anio: {
            field: 'anio',
            fn: (value) => value
        }
    };
}
export const HudsAccesoCtr = new HudsAccesoResource({});
export const HudsAccesoRouter = HudsAccesoCtr.makeRoutes();

HudsAccesoRouter.post('/huds-token', Auth.authenticate(), (req, res, next) => {
    return res.json({ token: Auth.generateHudsToken() });
});

HudsAccesoRouter.get('/accesos', Auth.authenticate(), async (req: any, res, next) => {
    const filtros = {};

    if (req.query.fechaDesde && req.query.fechaHasta) {
        filtros['$and'] = [
            { 'accesos.fecha': { $gte: new Date(req.query.fechaDesde) } },
            { 'accesos.fecha': { $lte: new Date(req.query.fechaHasta) } }
        ];
    } else if (req.query.fechaDesde && !req.query.fechaHasta) {
        filtros['$and'] = [
            { 'accesos.fecha': { $gte: new Date(req.query.fechaDesde) } },
        ];
    } else if (!req.query.fechaDesde && req.query.fechaHasta) {
        filtros['$and'] = [
            { 'accesos.fecha': { $lte: new Date(req.query.fechaHasta) } }
        ];
    }

    if (req.query.turno) {
        filtros['accesos.turno'] = req.query.turno;
    }

    if (req.query.prestacion) {
        filtros['accesos.prestacion'] = req.query.prestacion;
    }

    if (req.query.organizacion) {
        filtros['accesos.organizacion.nombre'] = {
            $regex: utils.makePattern(req.query.organizacion)
        };
    }

    if (req.query.usuario) {
        filtros['accesos.usuario.nombre'] = {
            $regex: utils.makePattern(req.query.usuario)
        };
    }

    try {
        const huds: any = await HudsAcceso.find(filtros);

        return res.json(huds);
    } catch (err) {
        return next(err);
    }
});
