
import { Agenda } from '../modules/turnos/schemas/agenda';
import { Prestacion } from '../modules/rup/schemas/prestacion';
import { Profesional } from '../core/tm/schemas/profesional';
import moment = require('moment');
import { getTurno } from 'modules/turnos/controller/agenda';

async function run(done) {
    const query: any = {
        $and: [
            { 'solicitud.turno': { $exists: true } },
            { 'solicitud.turno' : { $ne: null } }
        ],
        'estadoActual.tipo': 'validada'
    };

    if (process.argv.length > 3) {
        query.$and.unshift({ createdAt: { $gte: moment(process.argv[3]) } });
        query.$and.unshift({ createdAt: { $lte: moment(process.argv[4]) } });
    }

    const prestaciones = Prestacion.find(query).cursor({ batchSize: 200 });

    for await (const prestacion of prestaciones) {
        const turnoId = prestacion.solicitud.turno;
        const agenda: any = await Agenda.findOne({
            $or: [
                { 'bloques.turnos._id': turnoId },
                { 'sobbreturnos._id': turnoId }
            ]
        });

        const turno = getTurno(null, agenda, turnoId.toString());
        if (turno && !turno.profesional) {
            const profesional = await Profesional.findOne({ documento: prestacion.estadoActual.createdBy.documento });
            if (profesional) {
                turno.profesional = profesional._id;
            }

            await Agenda.findByIdAndUpdate(agenda.id, agenda);
        }
    }

    done();
}

export = run;
