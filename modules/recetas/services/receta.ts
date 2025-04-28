import { services } from '../../../services';
import { informarLog } from './../recetaLogs';

export async function getReceta(idReceta, sistema) {
    const name = 'obtener-receta-' + sistema;
    try {
        const response = await services.get(name).exec({ id: idReceta });
        if (response) {
            const dispensa = response.dispensa || [];
            const estado = response.estado || '';
            return {
                dispensa,
                tipoDispensaActual: estado,
            };
        }
    } catch (e) {
        await informarLog.error(name, { idReceta, sistema }, e);
    }
    return null;
}

