import { Paciente } from '../core-v2/mpi/paciente/paciente.schema';
import { userScheduler } from '../config.private';
import { AndesDrive } from '@andes/drive';
import * as configPrivate from '../config.private';
import { storePhoto } from '../core-v2/mpi/paciente/paciente.controller';
import { Types } from 'mongoose';


async function run(done) {
    AndesDrive.setup(configPrivate.Drive);
    const cursor = Paciente.find(
        {
            $and: [
                { foto: { $exists: true } },
                { foto: { $ne: null } }
            ]
        },
        '+foto'
    ).cursor({ batchSize: 100 });
    const deleteFotoPaciente = async (pac) => {
        try {
            if (!pac.fotoId) {
                pac.fotoId = new Types.ObjectId();
            }
            const fotoDrive = await AndesDrive.find(pac.fotoId);
            if (!fotoDrive) {
                const data = await storePhoto(pac.foto, pac.fotoId, userScheduler);
                if (data) {
                    await Paciente.updateOne(
                        { _id: pac.id },
                        { $set: { foto: null } }
                    );
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
