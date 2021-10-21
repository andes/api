import { VacunasPacientes } from '../modules/vacunas/schemas/vacunas-pacientes.schema';

async function run(done) {
    const from = new Date('2021-02-01T00:00:00.000-03:00');
    const vacunasPacientes: any = VacunasPacientes.aggregate([
        { $match: { 'aplicaciones.fechaAplicacion': { $gte: from }, cantDosis: 1 } },
        { $group: { _id: '$paciente.id', count: { $sum: 1 }, id: { $last: '$_id' } } },
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
