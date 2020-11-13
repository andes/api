import { paciente } from '../core/mpi/schemas/paciente';
import { updatePaciente } from '../core/mpi/controller/paciente';
import { userScheduler } from '../config.private';
let dataLog: any = new Object(userScheduler);
dataLog.body = { _id: null };
dataLog.method = null;

// Actualiza el token de pacientes con tildes o 'ñ' en su nombre/apellido
async function run(done) {
    let query = [];
    ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'].forEach(char => {
        query.push({ tokens: RegExp(`${char}`) });
    });
    const cursor = paciente.find({ $or: query }).cursor({ batchSize: 100 });
    const updatePatient = async (pac) => {
        try {
            if (pac.tokens?.length) {
                let data = [];
                pac.tokens.forEach(t => {
                    if (t.length) {
                        data.push(replaceChars(t));
                    }
                });
                await updatePaciente(pac, { tokens: data }, dataLog);
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

function replaceChars(text: string) {
    text = text.replace(/á/gi, 'a');
    text = text.replace(/é/gi, 'e');
    text = text.replace(/í/gi, 'i');
    text = text.replace(/ó/gi, 'o');
    text = text.replace(/ú/gi, 'u');
    text = text.replace(/ü/gi, 'u');
    text = text.replace(/ñ/gi, 'n');
    return text;
}

export = run;
