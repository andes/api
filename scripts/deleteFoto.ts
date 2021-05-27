
import { Paciente, PacienteCtr } from '../core-v2/mpi/paciente';
import { userScheduler } from '../config.private';


// Borra el campo 'foto' de los pacientes
async function run(done) {
    const cursor = Paciente.find({ $and: [{ 'relaciones.foto': { $exists: true } }, { 'relaciones.foto': /data:image/ }] }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            let data = { relaciones: pac.relaciones.toObject() };
            data.relaciones.forEach(rel => {
                if (rel.foto !== undefined) {
                    delete rel.foto;
                }
            });
            await PacienteCtr.update(pac, data, userScheduler as any);
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
