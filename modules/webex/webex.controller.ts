import { services } from './../../services';

export async function generateWebexLinks(turno: any, agenda: any, usuario: string) {
    try {
        const params = {
            idTurno: String(turno._id || turno.horaInicio),
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
        console.error('Error generating Webex links:', error?.message || error);
        return null;
    }
}
