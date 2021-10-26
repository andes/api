import { sincronizarVacunas } from '../modules/vacunas/controller/vacunas.events';
import { VacunasPacientes } from '../modules/vacunas/schemas/vacunas-pacientes.schema';

async function run(done) {
    const from = new Date('2021-02-01T00:00:00.000-03:00');
    const vacunasPacientes: any = VacunasPacientes.aggregate([
        { $match: { 'aplicaciones.fechaAplicacion': { $gte: from } } },
        { $group: { _id: '$paciente.id', count: { $sum: 1 } } },
        { $match: { _id: { $ne: null }, count: { $gt: 1 } } },
        { $project: { pacienteId: '$_id' } }
    ]).cursor({ batchSize: 100 });

    for await (const pacienteId of vacunasPacientes) {
        await VacunasPacientes.remove({ 'paciente.id': pacienteId._id });
        await sincronizarVacunas(pacienteId._id);
    }
    done();
}

export = run;
