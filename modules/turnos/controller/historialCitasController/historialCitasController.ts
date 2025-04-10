import { search as searchPrestaciones } from '../../../../modules/rup/controllers/prestacion';
import { getHistorialPaciente, getLiberadosPaciente } from '../../controller/turnosController';
import moment = require('moment');
import { PacienteCtr } from '../../../../core-v2/mpi/paciente/paciente.routes';

export async function getHistorial(req) {

    const turnos = getHistorialPaciente(req);
    const liberados = getLiberadosPaciente(req);
    const fueraAgendas = getHistorialFueraAgendas(req.query.pacienteId);
    const result = await Promise.all([turnos, liberados, fueraAgendas]);
    const historial = [...result[0], ...result[1], ...result[2]];

    return historial;
}

async function getHistorialFueraAgendas(pacienteId) {
    const paciente = await PacienteCtr.findById(pacienteId);

    const paramsFueraAgenda = {
        'paciente.id': { $in: paciente.vinculos },
        'estadoActual.tipo': 'validada',
        inicio: 'fuera-agenda',
        'solicitud.ambitoOrigen': 'ambulatorio',
        'ejecucion.fecha': { $gt: moment().subtract(1, 'year').startOf('day').toDate() },
        'solicitud.turno': null
    };

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
