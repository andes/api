import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
const dbg = debug('elastic');

export async function elasticSync(done) {
    try {
        const connElastic = new ElasticSync();
        // Buscamos los pacientes que estan en mongo y no en Elasticsearch
        const cursorPacientesMpi = pacienteMpi.find({}).cursor();
        await cursorPacientesMpi.eachAsync(async (pacMpi: any) => {
            if (!pacMpi) { return null; }
            const query = {
                query: {
                    ids: { values: pacMpi._id }
                }
            };
            let elasticResult = await connElastic.search(query);
            // Logueamos los pacientes que no aparecen en elastic y los sincronizamos
            if (elasticResult && elasticResult.hits.total < 1) {
                dbg(' ELASTIC RESULT---> ', elasticResult);
                dbg('PACIENTE NO EXISTE EN ELASTIC---> ', pacMpi._id);
                connElastic.sync(pacMpi);
            }

        });

        const cursorPacientesAndes = paciente.find({}).cursor();
        await cursorPacientesAndes.eachAsync(async (pacAndes: any) => {
            if (!pacAndes) { return null; }
            const query = {
                query: {
                    ids: { values: pacAndes._id }
                }
            };
            let elasticResult = await connElastic.search(query);
            // Logueamos los pacientes que no aparecen en elastic y los sincronizamos
            if (elasticResult && elasticResult.hits.total < 1) {
                connElastic.sync(pacAndes);
            }
        });

        done();
    } catch (err) {
        dbg('ERROR -->', err);
    }
}
