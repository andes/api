import {
    paciente,
    pacienteMpi
} from '../schemas/paciente';
import { ElasticSync } from '../../../utils/elasticSync';
import debug = require('debug');
import * as mongoose from 'mongoose';
import { userScheduler } from '../../../config.private';
import { logKeys } from '../../../config';
import * as log from '@andes/log';
import { model as prestacionModel } from '../../../modules/rup/schemas/prestacion';
import * as agendaModel from '../../../modules/turnos/schemas/agenda';
import { auditoriaPrestacionPaciente } from 'modules/auditorias/schemas/auditoriaPrestacionPaciente';
import { Auth } from '../../../auth/auth.class';
const dbg = debug('elasticFix');

export async function elasticFix(done) {
    try {
        const connElastic = new ElasticSync();
        dbg('Elastic Fix started');
        /*
          1-  buscar pacientes del log q estan en mpi y no en elastic
          2-  buscar con el dni de cada paciente sus indices en elastic
          3-  recorrer cada resultado y buscar con hit._id en prestaciones y  en bloques.turnos.paciente.id'
          5-  reemplazar id de paciente en prestaciones y turnos por el id del paciente en mongo
          6-  delete index en elastic (hit._id)
          */
        let logs = await log.query('elastic:notFound:mpi', null);
        for (let logData of logs) {

            let idPacienteMPI = new mongoose.Types.ObjectId((logData as any).paciente);
            let pacMpi: any = await pacienteMpi.findOne({ _id: idPacienteMPI });
            if (!pacMpi) { return; }
            dbg('Paciente a modificar--->', pacMpi._id);
            const query = {
                query: {
                    term: { documento: pacMpi.documento }
                }
            };
            connElastic.sync(pacMpi);
            let response = await connElastic.search(query);
            if (!response || !response.hits || !response.hits.hits) { return; }
            for (let hit of response.hits.hits) {
                let idElastic = new mongoose.Types.ObjectId(hit._id);

                let prestacionesPacienteElastic = await prestacionModel.find({ 'paciente.id': idElastic });
                let agendasPacienteElastic = await agendaModel.find({ 'bloques.turnos.paciente.id': idElastic }).cursor();
                try {

                    if (prestacionesPacienteElastic && prestacionesPacienteElastic.length > 0) {
                        for (let prestacion of prestacionesPacienteElastic) {
                            dbg('Prestacion modificada---> ', (prestacion as any)._id);
                            (prestacion as any).paciente.id = idPacienteMPI;
                            Auth.audit(prestacion, (userScheduler as any));
                            await prestacion.save();
                        }
                    }

                    await agendasPacienteElastic.eachAsync(async agenda => {
                        let turnos;
                        let index = -1;
                        for (let x = 0; x < (agenda as any).bloques.length; x++) {
                            // Si existe este bloque...
                            turnos = (agenda as any).bloques[x].turnos;
                            index = turnos.findIndex((t) => {
                                if (t.paciente && t.paciente.id) {
                                    return t.paciente.id.toString() === idPacienteMPI.toString();
                                } else {
                                    return false;
                                }
                            });
                            if (index > -1) {
                                dbg('agenda modificada---> ', (agenda as any)._id);
                                (agenda as any).bloques[x].turnos[index].paciente.id = idPacienteMPI;
                                await agenda.save();
                            }
                        }
                    });
                    await log.log(userScheduler, logKeys.elasticFix2.key, hit, logKeys.elasticFix2.operacion, hit._id);
                } catch (error) {
                    dbg('ERROR -------------------->', error);
                    await log.log(userScheduler, logKeys.elasticFix.key, hit, logKeys.elasticFix.operacion, error);
                }
            }
        }
        done();
    } catch (err) {
        dbg('ERR-------------------->', err);
        await log.log(userScheduler, logKeys.elasticFix.key, {}, logKeys.elasticFix.operacion, err);
    }
}
