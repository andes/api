import { paciente } from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
import * as mongoose from 'mongoose';
import { userScheduler } from '../../../config.private';
import { logKeys } from '../../../config';
import { log } from '@andes/log';
const dbg = debug('elastic');

export async function elasticCheck(done) {
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
            // Logueamos los pacientes que no aparecen en elastic
            if (elasticResult && elasticResult.hits.total < 1) {
                dbg(' ELASTIC RESULT---> ', elasticResult);
                dbg('PACIENTE NO EXISTE EN ELASTIC---> ', pacAndes._id);
                await log(userScheduler, logKeys.elasticCheck1.key, pacAndes, logKeys.elasticCheck1.operacion, pacAndes._id, null);


            }
        });

        // Buscamos pacientes indexados en elasticsearch que no existan en mongo
        // first we do a search, and specify a scroll timeout
        let response = await connElastic.searchScroll();
        let count = 0;
        while (response.hits && response.hits.hits.length) {
            for (let hit of response.hits.hits) {
                // dbg('ID PACIENTE---> ', hit._id);

                let id = new mongoose.Types.ObjectId(hit._id);
                let pac = await paciente.findOne({ _id: id });
                if (!pac) {
                    dbg('PACIENTE NO EXISTE EN MONGO---> ', hit);
                    await log(userScheduler, logKeys.elasticCheck3.key, hit, logKeys.elasticCheck3.operacion, hit._id, null);
                }
                count++;
            }
            dbg('TODO OK-------------------->', count);
            response = await connElastic.scroll({
                scroll_id: response._scroll_id,
                scroll: '5m'
            });
        }
        done();
    } catch (err) {
        dbg('ERROR -->', err);
    }
}
