import { search as searchPrestaciones } from '../../../../modules/rup/controllers/prestacion';
import { getLiberadosPaciente } from '../../controller/turnosController';
import { getHistorialPaciente } from '../../../../core-v2/mpi/paciente/paciente.controller';
import { PacienteCtr } from '../../../../core-v2/mpi/paciente/paciente.routes';
import moment = require('moment');
import * as mongoose from 'mongoose';

export async function getHistorial(req) {
    let historial = [];
    const turnosPaciente = [];

    const estado = req.query.estado;

    const acciones = [
        { estados: [undefined, 'asignado', 'suspendido'], fn: getHistorialPaciente },
        { estados: [undefined, 'fuera de agenda'], fn: getHistorialFueraAgendas },
        { estados: [undefined, 'liberado'], fn: getLiberadosPaciente }
    ];

    for (const { estados, fn } of acciones) {
        if (estados.includes(estado)) {
            turnosPaciente.push(fn(req));
        }
    }

    const result = await Promise.all(turnosPaciente);
    if (result.length === 1) {
        historial = [...result[0]];
    } else {
        historial = [...result[0], ...result[1], ...result[2]];
    }
    historial.sort((a, b) => moment(b.horaInicio).valueOf() - moment(a.horaInicio).valueOf());
    return historial;
}

async function getHistorialFueraAgendas(req) {
    const paciente = await PacienteCtr.findById(req.query.pacienteId);

    const paramsFueraAgenda = {
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada',
        inicio: 'fuera-agenda',
        'solicitud.ambitoOrigen': 'ambulatorio',
        'solicitud.turno': null
    };

    if (req.query.desde && req.query.hasta) {
        paramsFueraAgenda['ejecucion.fecha'] = {
            $gte: moment(req.query.desde).startOf('day').toDate(),
            $lte: moment(req.query.hasta).endOf('day').toDate()
        };
    } else if (req.query.desde) {
        paramsFueraAgenda['ejecucion.fecha'] = {
            $gte: moment(req.query.desde).startOf('day').toDate(),
        };
    } else if (req.query.hasta) {
        paramsFueraAgenda['ejecucion.fecha'] = {
            $lte: moment(req.query.hasta).endOf('day').toDate()
        };
    }

    if (req.query.prestacion) {
        paramsFueraAgenda['solicitud.tipoPrestacion.id'] = mongoose.Types.ObjectId(req.query.prestacion);
    }
    const fueraAgendas = await searchPrestaciones(paramsFueraAgenda);

    const historialFueraAgendas = fueraAgendas.map((elem: any) => ({
        estado: 'fuera-agenda',
        horaInicio: elem.ejecucion.fecha,
        organizacion: elem.solicitud.organizacion,
        profesionales: [elem.solicitud.profesional],
        paciente: elem.paciente,
        tipoPrestacion: elem.solicitud.tipoPrestacion
    }));

    return historialFueraAgendas;
}
