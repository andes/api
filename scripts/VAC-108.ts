import { VacunasPacientes } from '../modules/vacunas/schemas/vacunas-pacientes.schema';

async function run(done) {
    const vacunasPacientes: any = VacunasPacientes.aggregate([
        { $match: { 'aplicaciones.fechaAplicacion': { $gte: '2021-10-03' } } },
        { $group: { _id: '$paciente.id', count: { $sum: 1 }, id: { $first: '$_id' } } },
        { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
        { $project: { _id: '$id' } }
    ]).cursor({ batchSize: 100 });

    const ids = [];
    for await (const vac of vacunasPacientes) {
        ids.push(vac._id);
    }

    await VacunasPacientes.remove({ _id: { $in: ids } });

    done();
}

export = run;
