
import { CondicionPaciente } from './condicionPaciente.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { verificarCondicionPaciente } from './condicionPaciente.controller';

const { Engine } = require('json-rules-engine');

class CondicionPacienteResource extends ResourceBase {
    Model = CondicionPaciente;
    resourceName = 'condicionesPaciente';
    middlewares = [Auth.authenticate()];
    searchFileds = {
        activo: MongoQuery.equalMatch,
        conceptoId: {
            field: 'tipoPrestacion.conceptId',
            fn: MongoQuery.equalMatch
        },
        term: {
            field: 'tipoPrestacion.term',
            fn: MongoQuery.partialString
        },
    };
}

export const CondicionPacienteCtr = new CondicionPacienteResource({});
export const CondicionPacienteRouter = CondicionPacienteCtr.makeRoutes();


CondicionPacienteRouter.get('/rules', Auth.authenticate(), async (req, res, next) => {
    if (!req.query.paciente) {
        return next(403);
    }
    if (req.query.prestacion) {
        const condicion: any = await CondicionPaciente.findOne({ 'tipoPrestacion.conceptId': req.query.prestacion });
        const verificar = await verificarCondicionPaciente(condicion, req.query.paciente, Auth.getOrganization(req));
        if (verificar) {
            return res.json([condicion.tipoPrestacion]);
        }
    } else {
        const condiciones: any = await CondicionPaciente.find({});
        const resultados = [];
        for (const condicion of condiciones) {
            const verificar = await verificarCondicionPaciente(condicion, req.query.paciente, Auth.getOrganization(req));
            if (verificar) {
                resultados.push(condicion.tipoPrestacion);
            }
        }
        return res.json(resultados);
    }
    return res.json([]);

});
