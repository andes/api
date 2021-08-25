import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';
import { Types } from 'mongoose';

async function run(done) {

    const fichas: any = await FormsEpidemiologia.find({ 'paciente.id': { $type: 'string' } });
    for await (const ficha of fichas) {
        const paciente = ficha.paciente;
        paciente.id = new Types.ObjectId(paciente.id);
        await FormsEpidemiologia.update(
            { _id: ficha.id },
            { $set: { paciente } }
        );
    }
    done();
}

export = run;
