const { Engine } = require('json-rules-engine');
import { loadDinamicContext } from './../../rup/dinamic-context.controller';
import * as mongoose from 'mongoose';

export async function verificarCondicionPaciente(condicion, pacienteId, organizacionId?) {
    if (condicion && condicion.rules) {
        let condicionPaciente = condicion.toObject();
        let idPaciente = mongoose.Types.ObjectId(pacienteId);
        let params = {
            id: new mongoose.Types.ObjectId(idPaciente)
        };
        if (organizacionId) {
            params['organizacion'] = mongoose.Types.ObjectId(organizacionId);
        }
        const contexto = await loadDinamicContext(
            condicionPaciente.contexto,
            params
        );
        let engine = new Engine();
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
