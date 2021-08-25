import { FormEpidemiologiaCtr } from '../modules/forms/forms-epidemiologia/forms-epidemiologia.routes';
import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Types } from 'mongoose';

async function run(done) {

    const fichas = await FormEpidemiologiaCtr.search({});
    for await (const ficha of fichas) {
        const paciente = ficha.paciente;
        if (typeof (paciente.id) === 'string') {
            paciente.id = new Types.ObjectId(paciente.id);
            await FormsEpidemiologia.update(
                { _id: ficha.id },
                { $set: { paciente } }
            );
        }
    }
    done();
}

export = run;
