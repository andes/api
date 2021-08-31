import { MongoQuery, ResourceBase } from '@andes/core';
import { GrupoPoblacional } from './schemas/grupo-poblacional.schema';
import { Engine } from 'json-rules-engine';
import { PacienteCtr } from '../../core-v2/mpi';
import { Auth } from '../../auth/auth.class';

class GrupoPoblacionalResource extends ResourceBase {
    Model = GrupoPoblacional;
    resourceName = 'grupo-poblacional';
    searchFileds = {
        search: ['nombre'],
        nombre: MongoQuery.inArray,
        descripcion: MongoQuery.partialString,
        activo: MongoQuery.equalMatch,
        ids: MongoQuery.inArray.withField('_id')
    };
}
export const GrupoPoblacionalCtr = new GrupoPoblacionalResource({});
export const GrupoPoblacionalRouter = GrupoPoblacionalCtr.makeRoutes();

async function verificarExcepcionGrupo(grupo, paciente) {
    const engine = new Engine();
    if (grupo && grupo.excepciones) {
        engine.addRule({ conditions: grupo.excepciones, event: { type: 'valid' } });
        engine.addFact('paciente', async () => {
            paciente = JSON.parse(paciente);
            if (paciente.id) {
                const pacienteMPI = await PacienteCtr.findById(paciente.id);
                return pacienteMPI.toObject({ virtuals: true });
            } else {
                return paciente;
            }
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

GrupoPoblacionalRouter.get('/grupo-poblacional/excepciones/:grupo', async (req, res, next) => {
    if (req.params.grupo) {
        const grupoPoblacional: any = await GrupoPoblacional.findOne({ nombre: req.params.grupo });
        const verificar = await verificarExcepcionGrupo(grupoPoblacional, req.query.paciente);
        return res.json(verificar);
    }
    return res.json(false);
});
