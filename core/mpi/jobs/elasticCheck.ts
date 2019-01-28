import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
import * as mongoose from 'mongoose';
import { Logger } from '../../../utils/logService';
import { userScheduler } from '../../../config.private';

const dbg = debug('elastic');

export async function elasticCheck(done) {
    try {
        const connElastic = new ElasticSync();
        // Buscamos los pacientes que estan en mongo y no en Elasticsearch
        const cursorPacientesMpi = pacienteMpi.find({}).cursor();
        cursorPacientesMpi.eachAsync(async (pacMpi: any) => {
            if (!pacMpi) { return null; }
            const query = {
                query: {
                    ids: { values: pacMpi._id }
                }
            };
            let elasticResult = await connElastic.search(query);
            // Logueamos los pacientes que no aparecen en elastic
            if (elasticResult && elasticResult.hits.total < 1) {
                dbg(' ELASTIC RESULT---> ', elasticResult);
                dbg('PACIENTE NO EXISTE EN ELASTIC---> ', pacMpi._id);
                Logger.log(userScheduler, 'mpi', 'error', pacMpi);
            }
        });

        const cursorPacientesAndes = paciente.find({}).cursor();
        cursorPacientesAndes.eachAsync(async (pacAndes: any) => {
            if (!pacAndes) { return null; }
            // dbg('ID PACIENTE---> ', pacMpi._id);
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
                Logger.log(userScheduler, 'mpi', 'error', pacAndes);

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
                    pac = await pacienteMpi.findOne({ _id: id });
                    if (!pac) {
                        dbg('PACIENTE NO EXISTE EN MONGO---> ', hit);
                        Logger.log(userScheduler, 'elastic', 'error', hit);

                    }
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
