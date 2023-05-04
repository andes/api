import { codificarTurno } from '../modules/turnos/controller/agenda';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Types } from 'mongoose';
import * as moment from 'moment';

async function run(done) {

    const dias = 1;
    const fechaDesde: Date = moment().subtract(dias, 'days').toDate();
    const match = { 'solicitud.ambitoOrigen': 'ambulatorio', 'solicitud.turno': { $ne: null }, createdAt: { $gte: fechaDesde } };
    const prestacionAmbulatoria = Prestacion.find(match).cursor({ batchSize: 100 });

    let agendas: any;

    for await (const prestacion of prestacionAmbulatoria) {

        const turnoId = prestacion.solicitud.turno;

        agendas = await Agenda.find({
            $or: [
                { 'bloques.turnos._id': Types.ObjectId(turnoId) },
                { 'sobreturnos._id': Types.ObjectId(turnoId) }
            ]
        });

        for (const agenda of agendas) {
            for (const bloque of agenda.bloques) {
                for (const turno of bloque.turnos) {
                    if (String(turno._id) === String(turnoId)) {
                        if (turno.diagnostico.codificaciones.length === 0) {
                            if (!turno.horaAsistencia) {
                                turno.horaAsistencia = turno.horaInicio;
                            }
                            const data = await codificarTurno('', [agenda], turnoId);
                            await Agenda.findByIdAndUpdate(agenda.id, data[0]);
                        }
                    }
                }
                for (const sobreturno of agenda.sobreturnos) {
                    if (String(sobreturno._id) === String(turnoId)) {
                        if (sobreturno.diagnostico.codificaciones.length === 0) {
                            const data = await codificarTurno('', [agenda], turnoId);
                            await Agenda.findByIdAndUpdate(agenda.id, data[0]);
                        }
                    }
                }
            }
        }
    }
    done();
}

export = run;
