import { services } from './../../services';

export async function search(data) {
    let params;
    const service = 'get-LABAPI';
    if (data.idProtocolo) {
        params = {
            parametros: `nombre=LABAPI_GetResultadoProtocolo&parametros=${data.idProtocolo}`
        };
    } else {
        params = {
            parametros: `nombre=LABAPI_GetProtocolos&parametros=${data.estado}|${data.dni}|${data.fechaNac}|${data.apellido}|${data.fechaDesde}|${data.fechaHasta}`
        };
    }
    const response = await services.get(service).exec(params);
    return response;
}
