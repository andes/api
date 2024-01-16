import { Agenda } from '../modules/turnos/schemas/agenda';
import { Types } from 'mongoose';


async function run(done) {
    // se corrigen turnos en donde las OS quedaron de forma incorrecta
    const ultimasAgendas = {
        // Fechas entre las que hubo problema con OS de pacientes
        horaInicio: {
            $gte: new Date('2024-01-04 00:00:00.000-03:00'),
            $lte: new Date('2024-01-31 00:00:00.000-03:00')
        },
        'bloques.turnos.paciente.obraSocial.nombre.nombre': { $exists: true }
    };
    const cursor = Agenda.find(ultimasAgendas).cursor({ batchSize: 100 });
    const actualizarTurnos = async (agenda) => {
        let obraSocial = {
            nombre: '',
            financiador: '',
            prepaga: false,
            codigoPuco: null
        };

        for (const bloque of agenda.bloques) {
            for (const turno of bloque.turnos) {
                if (turno.estado === 'asignado') {
                    if (turno.paciente?.obraSocial?.nombre?.nombre) {
                        obraSocial = turno.paciente.obraSocial.nombre;
                        if (turno.paciente.obraSocial) {
                            await Agenda.update(
                                { _id: agenda.id },
                                {
                                    $set: { 'bloques.$[elemento1].turnos.$[elemento2].paciente.obraSocial': obraSocial }
                                },
                                { arrayFilters: [{ 'elemento1._id': Types.ObjectId(bloque.id) }, { 'elemento2._id': Types.ObjectId(turno.id) }] }
                            );
                        }
                    }
                }
            }
        }
    };
    await cursor.eachAsync(async (agenda: any) => {
        await actualizarTurnos(agenda);
    });
    done();
}

export = run;
