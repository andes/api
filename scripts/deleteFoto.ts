import { paciente } from '../core/mpi/schemas/paciente';
import { updatePaciente } from '../core/mpi/controller/paciente';
import { userScheduler } from '../config.private';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Borra el campo 'foto' de los pacientes
async function run(done) {
    const cursor = paciente.find({ $and: [{ 'relaciones.foto': { $exists: true } }, { 'relaciones.foto': /data:image/ }] }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            let data = { relaciones: pac.relaciones.toObject() };
            data.relaciones.forEach(rel => {
                if (rel.foto !== undefined) {
                    delete rel.foto;
                }
            });
            await updatePaciente(pac, data, dataLog);
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
