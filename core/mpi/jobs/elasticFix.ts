import {
    paciente
} from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
import * as mongoose from 'mongoose';
import { userScheduler } from '../../../config.private';
import { logKeys } from '../../../config';
import * as log from '@andes/log';
import { model as prestacionModel } from '../../../modules/rup/schemas/prestacion';
import * as agendaModel from '../../../modules/turnos/schemas/agenda';
import { Auth } from '../../../auth/auth.class';
const dbg = debug('elasticFix');

export async function elasticFix(done) {
    try {
        const connElastic = new ElasticSync();
        dbg('Elastic Fix started');
        /*
          1-  buscar pacientes del log q estan en mongo y no en elastic
          2-  buscar con el dni de cada paciente sus indices en elastic
          3-  recorrer cada resultado y buscar con hit._id en prestaciones y  en bloques.turnos.paciente.id'
          5-  reemplazar id de paciente en prestaciones y turnos por el id del paciente en mongo
          6-  delete index en elastic (hit._id)
          */
        let logs = await log.query('elastic:notFound:andes', null);
        if (logs && logs.length) {
            dbg('Corrigiendo pacientes en andes que no existen en elastic, cantidad:', logs.length);
        }
        for (let logData of logs) {

            let idPaciente = new mongoose.Types.ObjectId((logData as any).paciente);
            let pac: any = await paciente.findOne({ _id: idPaciente });
            if (!pac) { return; }
            dbg('Paciente a modificar--->', pac._id);
            const query = {
                query: {
                    term: { documento: pac.documento }
                }
            };
            let response = await connElastic.search(query);
            if (!response || !response.hits || !response.hits.hits) { return; }
            for (let hit of response.hits.hits) {
                dbg('procesando1 paciente', hit);

                let idElastic = new mongoose.Types.ObjectId(hit._id);
                await log.log(userScheduler, logKeys.elasticFix2.key, hit, logKeys.elasticFix2.operacion, pac._id);
                await fixAgendasPrestaciones(idElastic, idPaciente, hit);
            }
            await connElastic.sync(pac);
        }

        /*
        1-Buscamos los logs de los pacientes de elastic que no estan en las bd
        2- buscamos por dni en las bds
        3- buscamos prestaciones y agendas con el id de elastic
        4- reemplazamos el id del paciente de elastic (que no existe) en prestaciones y agendas por el id del paciente en mongo
        */
        let logsElastic = await log.query('andes:notFound', null);
        for (let logElasticData of logsElastic) {
            const query = {
                query: {
                    term: { id: (logElasticData as any).paciente.toString() }
                }
            };
            let response = await connElastic.search(query);
            if (!response || !response.hits || !response.hits.hits) { return; }
            if (response.hits.hits.length && response.hits.hits.length > 0) {
                let hit = response.hits.hits[0];
                let pac = await paciente.findOne({ documento: hit._source.documento });
                if (pac) {
                    dbg('procesando2 paciente', pac._id);
                    await log.log(userScheduler, logKeys.elasticFix2.key, hit, logKeys.elasticFix2.operacion, pac._id);
                    await fixAgendasPrestaciones((logElasticData as any).paciente, pac._id, hit);
                }
            }
        }
        done();
    } catch (err) {
        dbg('ERR-------------------->', err);
        await log.log(userScheduler, logKeys.elasticFix.key, {}, logKeys.elasticFix.operacion, err);
    }
}

async function fixAgendasPrestaciones(idOriginal: any, idNuevo, hit: any) {
    let prestacionesPacienteElastic = await prestacionModel.find({ 'paciente.id': idOriginal });
    let agendasPacienteElastic = await agendaModel.find({ 'bloques.turnos.paciente.id': idOriginal });
    if (prestacionesPacienteElastic && prestacionesPacienteElastic.length > 0) {
        for (let prestacion of prestacionesPacienteElastic) {
            dbg('Prestacion modificada---> ', (prestacion as any)._id);
            (prestacion as any).paciente.id = idNuevo;
            try {
                Auth.audit(prestacion, (userScheduler as any));
                await prestacion.save();
            } catch (err) {
                dbg('ERROR -------------------->', err);
                await log.log(userScheduler, logKeys.elasticFix.key, hit, logKeys.elasticFix.operacion, err);
            }
        }
    }
    if (agendasPacienteElastic && agendasPacienteElastic.length > 0) {
        for (let agenda of agendasPacienteElastic) {
            let turnos;
            let index = -1;
            for (let x = 0; x < (agenda as any).bloques.length; x++) {
                // Si existe este bloque...
                turnos = (agenda as any).bloques[x].turnos;
                index = turnos.findIndex((t) => {
                    if (t.paciente && t.paciente.id) {
                        return t.paciente.id.toString() === idOriginal.toString();
                    } else {
                        return false;
                    }
                });
                if (index > -1) {
                    dbg('agenda modificada---> ', (agenda as any)._id, 'indexTurno:', index, 'ID ORIGINAL:', idOriginal, 'ID NUEVO: ', idNuevo);
                    (agenda as any).bloques[x].turnos[index].paciente.id = idNuevo;
                    try {
                        Auth.audit(agenda, (userScheduler as any));
                        await agenda.save();
                    } catch (error) {
                        dbg('ERROR -------------------->', error);
                        await log.log(userScheduler, logKeys.elasticFix.key, hit, logKeys.elasticFix.operacion, error);
                    }
                }
            }

        }
    }
}

