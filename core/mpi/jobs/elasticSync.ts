import { paciente } from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
const dbg = debug('elastic');

export async function elasticSync(done) {
    try {
        const connElastic = new ElasticSync();
        // Buscamos los pacientes que estan en mongo y no en Elasticsearch

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
