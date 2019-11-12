import * as mongoose from 'mongoose';
import { HudsAcceso } from './hudsAccesos.schema';
import { Auth } from '../../auth/auth.class';
import { ResourceBase } from '@andes/core';
import { logAcceso } from './hudsAccesos';
import * as utils from '../../utils/utils';

class HudsAccesoResource extends ResourceBase {
    Model = HudsAcceso;
    resourceName = 'huds-accesos';
    middlewares = [Auth.authenticate()];
    routesAuthorization = {
        get: Auth.authorize('log:get'),
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

HudsAccesoRouter.post('/huds-token', Auth.authenticate(), async (req, res, next) => {
    // Persiste los datos de accesos y genera el token para acceder a la HUDS del paciente
    const orgId = mongoose.Types.ObjectId(req.body.organizacion.id);
    logAcceso(req, req.body.paciente, req.body.matricula, req.body.motivo, req.body.idTurno, req.body.idPrestacion);
    return res.json({ token: Auth.generateHudsToken(req.body.usuario, orgId, req.body.paciente) });
});

HudsAccesoRouter.get('/accesos/:id', Auth.authenticate(), async (req: any, res, next) => {
    if (req.params.id) {    // id del paciente
        const filtros = { paciente: mongoose.Types.ObjectId(req.params.id) };
        let query;

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

        query = HudsAcceso.aggregate([{ $match: filtros }]);

        // if (req.query.fields) {
        //        query.select(req.query.fields);
        // }

        try {
            const huds: any = await query.exec();

            return res.json(huds);
        } catch (err) {
            return next(err);
        }
    } else { return 'Parametros incorrectos'; }
});


HudsAccesoRouter.get('/checkToken', Auth.authenticate(), (req: any, res, next) => {
    let resp = false;
    if (req.query.token && req.query.idPaciente) {
        let tokenSettings = Auth.decode(req.query.token);
        if (tokenSettings && String(tokenSettings.paciente) === String(req.query.idPaciente)) {
            resp = true;
        }
    }
    return res.json(resp);
});
