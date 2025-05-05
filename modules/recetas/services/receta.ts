import { services } from '../../../services';
import { informarLog } from './../recetaLogs';

export async function getReceta(idReceta, sistema) {
    const name = 'obtener-receta-' + sistema;
    try {
        const response = await services.get(name).exec({ id: idReceta });
        if (response) {
            let dispensas = response.dispensas || [];
            const estado = response.estado || '';
            dispensas = dispensas.length ? dispensas.map(dis => ({
                dispensa: {
                    idDispensaApp: dis.dispensa.id,
                    fecha: dis.dispensa.fecha,
                    medicamentos: dis.dispensa.medicamentos,
                    organizacion: dis.dispensa.organizacion
                },
                estado: dis.op || estado,
            })) : [];

            return {
                dispensas,
                tipoDispensaActual: estado,
            };
        }
    } catch (e) {
        await informarLog.error(name, { idReceta, sistema }, e);
    }
    return null;
}

