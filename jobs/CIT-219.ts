import { codificarTurno } from '../modules/turnos/controller/agenda';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Types } from 'mongoose';
import * as moment from 'moment';

async function run(done) {

    const dias = 1;
    const fechaDesde: Date = moment().subtract(dias, 'days').toDate();
    const match = { 'estadoActual.tipo': 'validada', 'ejecucion.fecha': { $gte: fechaDesde }, 'solicitud.ambitoOrigen': 'ambulatorio', 'solicitud.turno': { $ne: null } };
    const prestacionAmbulatoria: any[] = await Prestacion.find(match);

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
                for (let turno of bloque.turnos) {

                    if (String(turno._id) === String(turnoId)) {
                        if (!turno.diagnostico.codificaciones.length) {

                            if (!turno.horaAsistencia) {
                                turno.horaAsistencia = turno.horaInicio;
                            }
                            const data = await codificarTurno('', [agenda], turnoId);
                            turno = data;
                            await Agenda.findByIdAndUpdate(agenda.id, agenda);
                        }
                    }
                }
                for (let sobreturno of agenda.sobreturnos) {
                    if (String(sobreturno._id) === String(turnoId)) {
                        if (!sobreturno.diagnostico.codificaciones.length) {
                            const data = await codificarTurno('', [agenda], turnoId);
                            sobreturno = data;
                            await Agenda.findByIdAndUpdate(agenda.id, agenda);
                        }
                    }
                }
            }
        }
    }
    done();
}

export = run;
