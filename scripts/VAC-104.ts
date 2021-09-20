import { VacunasPacientes } from './../modules/vacunas/schemas/vacunas-pacientes.schema';
import { Prestacion } from '../modules/rup/schemas/prestacion';

async function run(done) {
    const fechaDesde = new Date('2020-12-01 10:00:00.416Z');
    const fechaHasta = new Date();

    const parametros = {
        'ejecucion.fecha': { $gte: fechaDesde, $lte: fechaHasta },
        'estadoActual.tipo': 'validada',
        'ejecucion.registros.concepto.conceptId': '840534001',
        'ejecucion.registros.valor.vacuna.enDomicilio': { $exists: true }
    };

    const prestaciones = Prestacion.find(parametros).cursor({ batchSize: 100 });
    for await (const prestacion of prestaciones) {
        const vacunaPaciente: any = await VacunasPacientes.findOne({
            'aplicaciones.idPrestacion': prestacion._id
        });
        if (vacunaPaciente) {
            const aplicaciones = vacunaPaciente.aplicaciones;
            const index = aplicaciones.findIndex(t => {
                return String(t.idPrestacion) === String(prestacion.id);
            });
            if (index >= 0 && !aplicaciones[index].enDomicilio) {
                aplicaciones[index].enDomicilio = true;
                await VacunasPacientes.update({ _id: vacunaPaciente._id }, { $set: { aplicaciones } });
            }
        }
    }
    done();
}

export = run;

