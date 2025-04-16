import { services } from '../../../services';

export async function getReceta(idReceta, sistema) {
    const name = 'obtener-receta-' + sistema;
    try {
        const response = await services.get(name).exec({ id: idReceta });
        if (response) {
            return {
                id: response.id,
                dispensa: response.dispensa,
                estadoDispensa: response.estadoDispensaActual
            };
        }
    } catch (e) { }
    return null;
}

