import * as debug from 'debug';
import { services } from './../../services';

const dbgWebex = debug('dbgWebex');

export async function generateWebexLinks(turno: any, agenda: any, usuario: string) {
    try {
        const params = {
            idTurno: String(turno._id),
            fechaHoraDesde: Math.floor(turno.horaInicio.getTime() / 1000.0),
            fechaHoraHasta: Math.floor((agenda.horaFin.getTime() + 60 * 60 * 1000) / 1000)
        };

        const servicio = services.get('teleconsulta');
        const result: any = await servicio.exec(params);

        if (result && result.baseUrl && result.host?.[0] && result.guest?.[0]) {
            return {
                professionalLink: result.baseUrl + result.host[0].short,
                patientLink: result.baseUrl + result.guest[0].short,
            };
        }

        return null;
    } catch (error) {
        dbgWebex('Error generating Webex links: %O', error?.message || error);
        return null;
    }
}
