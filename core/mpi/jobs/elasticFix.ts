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
const dbg = debug('elasticFix');

export async function elasticFix(done) {
    try {
        const connElastic = new ElasticSync();


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
                        3- reemplazar id de paciente en prestaciones y turnos por el id del paciente en mongo
                        4- delete index en elastic (hit._id)
                        */

                        let prestacionesPacienteElastic = await prestacionModel.find({ 'paciente.id': idElasticPaciente });
                        let agendasPacienteElastic = await agendaModel.find({ 'bloques.turnos.paciente.id': idElasticPaciente }).cursor();
                        let pacienteMongo = await pacienteMpi.findOne({ documento: hit.documento });
                        if (pacienteMongo) {
                            try {

                                if (prestacionesPacienteElastic && prestacionesPacienteElastic.length > 0) {
                                    for (let prestacion of prestacionesPacienteElastic) {
                                        dbg('Prestacion modificada---> ', (prestacion as any)._id);
                                        (prestacion as any).paciente.id = pacienteMongo._id;
                                        await prestacion.save();
                                    }
                                }

                                await agendasPacienteElastic.eachAsync(async agenda => {
                                    let turnos;
                                    let index = -1;
                                    for (let x = 0; x < (agenda as any).bloques.length; x++) {
                                        // Si existe este bloque...
                                        turnos = (agenda as any).bloques[x].turnos;
                                        index = turnos.findIndex((t) => t.paciente._id.toString() === idElasticPaciente.toString());
                                        if (index > -1) {
                                            dbg('agenda modificada---> ', (agenda as any)._id);
                                            (agenda as any).bloques[x].turnos[index].paciente.id = pacienteMongo._id;
                                            await agenda.save();
                                        }
                                    }
                                });
                                await connElastic.delete(idElasticPaciente);
                            } catch (error) {
                                dbg('ERROR -------------------->', error);
                                await log(userScheduler, logKeys.elasticFix.key, hit, logKeys.elasticFix.operacion, pacienteMongo, idElasticPaciente);
                            }
                        }
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
        dbg('ERR-------------------->', err);
        await log(userScheduler, logKeys.elasticFix.key, {}, logKeys.elasticFix.operacion, err);
    }
}
