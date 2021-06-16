const { Engine } = require('json-rules-engine');
import { PacienteCtr } from '../../../core-v2/mpi/paciente/paciente.routes';
import { PersonalSaludCtr } from '../../personalSalud';
import { Organizacion } from '../../../core/tm/schemas/organizacion';

export async function verificarCondicionPaciente(condicion, pacienteId, organizacionId?) {
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
        if (organizacionId) {
            engine.addFact('organizacion', async () => {
                const org = await Organizacion.findById(organizacionId);
                return org;
            });
        }
        return engine
            .run()
            .then(({ events }) => {
                return events.length > 0;
            });
    } else {
        return false;
    }
}
