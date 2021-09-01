import { userScheduler } from '../config.private';
import { Paciente, PacienteCtr, replaceChars } from '../core-v2/mpi';

const dataLog = {
    ...userScheduler,
    body: { _id: null },
    method: null
};

// Actualiza el token de pacientes con tildes o 'ñ' en su nombre/apellido
async function run(done) {
    const query = ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'].map(char => {
        return { tokens: RegExp(`${char}`) };
    });

    const cursor = Paciente.find({ $or: query }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            if (pac.tokens?.length) {
                const data = [];
                pac.tokens.forEach(t => {
                    if (t.length) {
                        data.push(replaceChars(t));
                    }
                });
                await PacienteCtr.update(pac._id, { tokens: data }, dataLog as any);
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
