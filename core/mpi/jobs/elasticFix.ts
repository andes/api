import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
import * as mongoose from 'mongoose';
import { userScheduler } from '../../../config.private';
import { logKeys } from '../../../config';
import { log } from '@andes/log';
import { model as prestacionModel } from '../../../modules/rup/schemas/prestacion';
import * as agendaModel from '../../../modules/turnos/schemas/agenda';
const dbg = debug('elastic');

export async function elasticFix(done) {
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
            // Logueamos los pacientes que no aparecen en elastic
            if (elasticResult && elasticResult.hits.total < 1) {
                dbg(' ELASTIC RESULT---> ', elasticResult);
                dbg('PACIENTE NO EXISTE EN ELASTIC---> ', pacMpi._id);
                await log(userScheduler, logKeys.elasticCheck2.key, pacMpi, logKeys.elasticCheck2.operacion, pacMpi._id, null);

            }
        });

        const cursorPacientesAndes = paciente.find({}).cursor();
        await cursorPacientesAndes.eachAsync(async (pacAndes: any) => {
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

                let idElasticPaciente = new mongoose.Types.ObjectId(hit._id);
                let pac = await paciente.findOne({ _id: idElasticPaciente });
                if (!pac) {
                    pac = await pacienteMpi.findOne({ _id: idElasticPaciente });
                    if (!pac) {

                        /*
                        1- buscar con hit._id en prestaciones y  en bloques.turnos.paciente.id'
                        2- si hay resultados buscar en mpi el paciente por dni y obtener su id mongo
                        3- reemplazar id en prestaciones y turnos por el id mongo
                        4- delete index en elastic (hit._id)
                        */

                        let prestacionesPacienteElastic = await prestacionModel.find({ 'paciente.id': idElasticPaciente });
                        let agendasPacienteElastic = await agendaModel.find({ 'bloques.turnos.paciente.id': idElasticPaciente }).cursor();
                        let pacienteMongo = await pacienteMpi.findOne({ documento: hit.documento });
                        try {

                            if (prestacionesPacienteElastic && prestacionesPacienteElastic.length > 0) {
                                for (let prestacion of prestacionesPacienteElastic) {
                                    prestacion._id = pacienteMongo._id;
                                    await prestacion.save();
                                }
                                prestacionModel.deleteMany({ _id: idElasticPaciente });
                            }

                            await agendasPacienteElastic.eachAsync(async agenda => {
                                let turnos;
                                let index = -1;
                                for (let x = 0; x < (agenda as any).bloques.length; x++) {
                                    // Si existe este bloque...
                                    turnos = (agenda as any).bloques[x].turnos;
                                    index = turnos.findIndex((t) => t.paciente._id.toString() === idElasticPaciente.toString());
                                    if (index > -1) {
                                        (agenda as any).bloques[x].turnos[index].paciente.id = pacienteMongo._id;
                                        await agenda.save();
                                    }
                                }
                            });

                            let elasticConnection = new ElasticSync();
                            await elasticConnection.delete(idElasticPaciente);

                        } catch (error) {

                            await log(userScheduler, logKeys.elasticFix.key, hit, logKeys.elasticFix.operacion, pacienteMongo, idElasticPaciente);
                        }
                        dbg('PACIENTE NO EXISTE EN MONGO---> ', hit);
                        await log(userScheduler, logKeys.elasticCheck3.key, hit, logKeys.elasticCheck3.operacion, hit._id, null);
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
