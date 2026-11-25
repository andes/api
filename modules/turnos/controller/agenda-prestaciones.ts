import * as debug from 'debug';
import { Prestacion } from '../../rup/schemas/prestacion';

export function populateIncluyePrestaciones(populate: any): boolean {
    if (!populate) {
        return false;
    }
    const valores = Array.isArray(populate) ? populate : String(populate).split(/[,\s]+/);
    return valores.map((valor) => String(valor).trim()).includes('prestaciones');
}

export const PRESTACION_BASICA_PROJECTION = {
    inicio: 1,
    'solicitud.fecha': 1,
    'solicitud.tipoPrestacion': 1,
    'solicitud.turno': 1,
    'estadoActual.tipo': 1,
    'estadoActual.createdAt': 1,
    createdAt: 1,
};

function idsTurnos(agendas: any[]): any[] {
    const ids = new Set<string>();
    agendas.forEach((agenda) => {
        (agenda.bloques || []).forEach((bloque) => {
            (bloque.turnos || []).forEach((turno) => {
                if (turno._id && turno.estado !== 'disponible') {
                    ids.add(String(turno._id));
                }
            });
        });
        (agenda.sobreturnos || []).forEach((turno) => {
            if (turno._id) {
                ids.add(String(turno._id));
            }
        });
    });
    return Array.from(ids);
}

function esMasRelevante(candidata: any, actual: any): boolean {
    const candidataModificada = candidata.estadoActual?.tipo === 'modificada' ? 0 : 1;
    const actualModificada = actual.estadoActual?.tipo === 'modificada' ? 0 : 1;
    if (candidataModificada !== actualModificada) {
        return candidataModificada > actualModificada;
    }
    return new Date(candidata.createdAt || 0).getTime() > new Date(actual.createdAt || 0).getTime();
}

export async function populatePrestaciones(agendas: any[]): Promise<any[]> {
    const agendasJson = (agendas || []).map((agenda) => (agenda.toJSON ? agenda.toJSON() : agenda));
    const ids = idsTurnos(agendasJson);
    if (!ids.length) {
        return agendasJson;
    }

    const porTurno = new Map<string, any>();
    try {
        const prestaciones = await Prestacion.find(
            { 'solicitud.turno': { $in: ids } },
            PRESTACION_BASICA_PROJECTION
        ).lean();
        prestaciones.forEach((prestacion: any) => {
            const idTurno = String(prestacion.solicitud.turno);
            const actual = porTurno.get(idTurno);
            if (!actual || esMasRelevante(prestacion, actual)) {
                porTurno.set(idTurno, prestacion);
            }
        });
    } catch (error) {
        debug('andes')(error);
        return agendasJson;
    }

    agendasJson.forEach((agenda) => {
        (agenda.bloques || []).forEach((bloque) => {
            (bloque.turnos || []).forEach((turno) => {
                const prestacion = porTurno.get(String(turno._id));
                if (prestacion) {
                    turno.prestacion = prestacion;
                }
            });
        });
        (agenda.sobreturnos || []).forEach((turno) => {
            const prestacion = porTurno.get(String(turno._id));
            if (prestacion) {
                turno.prestacion = prestacion;
            }
        });
    });

    return agendasJson;
}
