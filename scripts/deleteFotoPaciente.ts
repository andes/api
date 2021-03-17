import { Paciente } from '../core-v2/mpi/paciente/paciente.schema';
import { PacienteCtr } from '../core-v2/mpi/paciente/paciente.routes';
import { userScheduler } from '../config.private';
import { ObjectId } from 'mongodb';
import * as intoStream from 'into-stream';
import { FileMetadata, AndesDrive } from '@andes/drive';
import * as configPrivate from '../config.private';
import { storePhoto } from 'core-v2/mpi/paciente/paciente.controller';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;


async function run(done) {
    AndesDrive.setup(configPrivate.Drive);
    const cursor = Paciente.find({ $and: [{ 'foto': { $exists: true } }, { foto: { $ne: null } }] }, '+foto').cursor({ batchSize: 100 });
    const deleteFotoPaciente = async (pac) => {
        try {
            if (!pac.fotoId) {
                pac.fotoId = new ObjectId();
            }
            const fotoDrive = await AndesDrive.find(pac.fotoId);
            if (!fotoDrive) {
                const data = await storePhoto(pac.foto, pac.fotoId, dataLog);
                if (data) {
                    await PacienteCtr.update(pac._id, pac, dataLog);
                }

            }

        } catch (error) {
            return;
        }
    };

    await cursor.eachAsync(async (pac: any) => {
        await deleteFotoPaciente(pac);
    });
    done();
}

export = run;