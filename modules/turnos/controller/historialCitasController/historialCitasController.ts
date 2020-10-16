import { search as searchPrestaciones } from '../../../../modules/rup/controllers/prestacion';
import { getHistorialPaciente, getLiberadosPaciente } from '../../controller/turnosController';
import moment = require('moment');

export async function getHistorial(req) {
    let historial;
    if (req.query.sinLiberados) {
        historial = await getHistorialPaciente(req);
    } else {
        const turnos = getHistorialPaciente(req);
        const liberados = getLiberadosPaciente(req);
        const fueraAgendas =  getHistorialFueraAgendas(req.query.pacienteId);
        const result = await Promise.all([turnos, liberados, fueraAgendas]);
        historial = [...result[0], ...result[1], ...result[2]];
    }
    return historial;
}

async function getHistorialFueraAgendas(pacienteId) {
    const paramsFueraAgenda = {
        'paciente.id': pacienteId,
        'estadoActual.tipo': 'validada',
        'ejecucion.fecha': { $gt: moment().subtract(6, 'months') },
        'solicitud.turno' : null
    };
    const fueraAgendas = await searchPrestaciones(paramsFueraAgenda);
    let historialFueraAgendas = fueraAgendas.map((elem: any) => ({
        estado: 'fuera-agenda',
        horaInicio: elem.ejecucion.fecha,
        organizacion: elem.solicitud.organizacion,
        profesionales: [elem.solicitud.profesional],
        paciente: elem.paciente,
        tipoPrestacion: elem.solicitud.tipoPrestacion
    }));
    return historialFueraAgendas;
}
