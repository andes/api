
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { sincronizarVacunas } from '../modules/vacunas/controller/vacunas.events';
import { VacunasPacientes } from '../modules/vacunas/schemas/vacunas-pacientes.schema';

async function run(done) {
    const conceptVacuacionCovid = '840534001';
    const fechaDesde = new Date('2020-12-01T10:56:10.300-03:00');
    const hoy = new Date();
    const query = {
        'ejecucion.fecha': { $gte: fechaDesde, $lte: hoy },
        'estadoActual.tipo': 'validada',
        'ejecucion.registros.concepto.conceptId': conceptVacuacionCovid
    };

    const prestaciones = Prestacion.find(query).cursor({ batchSize: 100 });
    const migrarPrestaciones = async (prestacion) => {
        try {
            const idPaciente = prestacion.paciente.id;
            const registroExistente = await VacunasPacientes.findOne({ 'paciente.id': idPaciente });
            if (!registroExistente) {
                await sincronizarVacunas(idPaciente.toString());
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
        }
    };
    await prestaciones.eachAsync(async (prestacion) => {
        await migrarPrestaciones(prestacion);
    });
    done();
}

export = run;
