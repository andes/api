import { Agenda } from '../modules/turnos/schemas/agenda';
import { sumar } from '../modules/obraSocial/schemas/sumar';
import { Types } from 'mongoose';


async function run(done) {
    const ultimasAgendas = {
        // Fechas entre las que hubo problema con pacientes SUMAR
        $and: [
            { horaInicio: { $gte: new Date('2021-07-15T00:00:00.000-03:00') } },
            { horaInicio: { $lte: new Date('2021-08-04T00:00:00.000-03:00') } }
        ]
    };
    const agendas = Agenda.find(ultimasAgendas).cursor({ batchSize: 100 });
    const obraSocial = {
        codigoPuco: null,
        nombre: 'SUMAR',
        financiador: 'SUMAR',
    };
    for await (const agenda of agendas) {
        for await (const bloque of agenda.bloques) {
            for await (const turno of bloque.turnos) {
                if (turno.estado === 'asignado') {
                    if (!turno.paciente.obraSocial) {
                        const pacienteSumar = await sumar.find({
                            $and: [
                                { activo: 'S ' }, { afidni: turno.paciente.documento }
                            ]
                        });
                        if (pacienteSumar.length) {
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
    done();
}

export = run;
