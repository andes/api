import { sisa } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
export async function validarOrganizacionSisa(orgCodSisa: Number) {
    const data = {
        usuario: sisa.username,
        clave: sisa.password
    };
    const url = 'https://sisa.msal.gov.ar/sisa/services/rest/establecimiento/' + orgCodSisa;
    const options = {
        url,
        method: 'POST',
        json: true,
        body: data
    };
    return await handleHttpRequest(options);
}
