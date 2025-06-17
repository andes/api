import { services } from '../../../services';
import { informarLog } from './../recetaLogs';

export async function getReceta(idReceta, pacienteId, sistema) {
    const name = 'obtener-receta-' + sistema;
    try {
        const response = await services.get(name).exec({ id: idReceta, pacienteId });
        if (response?.status === 200) {
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
        } else if (response?.status === 404) {
            return {
                dispensas: [],
                tipoDispensaActual: 'sin-dispensa',
            };
        }
    } catch (e) {
        await informarLog.error(name, { idReceta, sistema }, e);
    }
    return null;
}

