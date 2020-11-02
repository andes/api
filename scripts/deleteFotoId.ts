import { paciente } from '../core/mpi/schemas/paciente';
import { updatePaciente } from '../core/mpi/controller/paciente';
import { userScheduler } from '../config.private';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Borra el campo 'fotoId' de los pacientes que lo posean pero no tengan el campo foto
async function run(done) {
    const cursor = paciente.find({ $and: [{ $or: [{ foto: { $exists: false } }, { foto: { $eq: null } }] }, { fotoId: { $exists: true } }] }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            if (!pac.foto || !pac.foto.length && pac.fotoId) {
                let data = { fotoId: undefined };
                await updatePaciente(pac, data, dataLog);
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
