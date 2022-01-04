import { FormsEpidemiologia } from '../modules/forms/forms-epidemiologia/forms-epidemiologia-schema';

async function run(done) {
    const fichas = FormsEpidemiologia.find({ active: { $exists: false } }).cursor();
    for await (const ficha of fichas) {
        const _id = ficha.id;
        const $set = { active: true };
        await FormsEpidemiologia.update({ _id }, { $set });
    }
    done();
}

export = run;
