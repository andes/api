const { Engine } = require('json-rules-engine');
import { loadDinamicContext } from './../../rup/dinamic-context.controller';
import * as mongoose from 'mongoose';

export async function verificarCondicionPaciente(condicion, pacienteId, organizacionId?) {
    if (condicion?.rules) {
        const condicionPaciente = condicion.toObject();
        const idPaciente = mongoose.Types.ObjectId(pacienteId);
        const params = {
            id: new mongoose.Types.ObjectId(idPaciente)
        };
        if (organizacionId) {
            params['organizacion'] = mongoose.Types.ObjectId(organizacionId);
        }
        const contexto = await loadDinamicContext(
            condicionPaciente.contexto,
            params
        );
        const engine = new Engine();
        engine.addRule({ conditions: condicion.rules, event: { type: 'valid' } });
        Object.keys(contexto).forEach(
            key => engine.addFact(key, contexto[key])
        );

        return engine
            .run()
            .then(({ events }) => {
                return events.length > 0;
            });
    } else {
        return false;
    }
}
