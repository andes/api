import { sisa } from '../../../config.private';
import { handleHttpRequest } from '../../../utils/requestHandler';
export async function validarOrganizacionSisa(orgCodSisa: Number) {
    const request = require('request');
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
    return handleHttpRequest(options);
    // return new Promise((resolve: any, reject: any) => {
    //     request(options, (error, response, body) => {
    //         if (response.statusCode >= 200 && response.statusCode < 300) {
    //             return resolve(body);
    //         }
    //         return resolve(error || body);
    //     });
    // });
}
