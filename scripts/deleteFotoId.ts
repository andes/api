import { Paciente } from '../core-v2/mpi/paciente/paciente.schema';
import { PacienteCtr } from '../core-v2/mpi/paciente/paciente.routes';
import { userScheduler } from '../config.private';
const dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Borra el campo 'fotoId' de los pacientes que lo posean pero no tengan el campo foto
async function run(done) {
    const cursor = Paciente.find({ $and: [{ $or: [{ foto: { $exists: false } }, { foto: { $eq: null } }] }, { fotoId: { $exists: true } }] }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            if (!pac.foto || !pac.foto.length && pac.fotoId) {
                const data = { fotoId: undefined };
                await PacienteCtr.update(pac.id, data, dataLog);
            }
        } catch (error) {
            return;
        }
    };

    await cursor.eachAsync(async (pac: any) => {
        await updatePatient(pac);
    });
    done();
}

export = run;
