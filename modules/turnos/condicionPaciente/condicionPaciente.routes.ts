
import { CondicionPaciente } from './condicionPaciente.schema';
import { MongoQuery, ResourceBase } from '@andes/core';
import { Auth } from '../../../auth/auth.class';
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { PersonalSaludCtr } from '../../personalSalud';
import { Organizacion } from '../../../core/tm/schemas/organizacion';
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

async function verificarCondicionPaciente(condicion, pacienteId, organizacionId) {
    let engine = new Engine();
    if (condicion && condicion.rules) {
        engine.addRule({ conditions: condicion.rules, event: { type: 'valid' } });
        engine.addFact('paciente', async () => {
            const paciente = await PacienteCtr.findById(pacienteId);
            return paciente.toObject({ virtuals: true });
        });
        engine.addFact('personal-salud', async (params, almanac) => {
            const paciente = await almanac.factValue('paciente');
            const personal = await PersonalSaludCtr.findOne({ documento: paciente.documento });
            return !!personal;
        });
        engine.addFact('organizacion', async () => {
            const org = await Organizacion.findById(organizacionId);
            return org;
        });
        return engine
            .run()
            .then(({ events }) => {
                return events.length > 0;
            });
    } else {
        return false;
    }
}

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

