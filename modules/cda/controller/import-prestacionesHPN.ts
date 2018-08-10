import * as configPrivate from '../../../config.private';
import * as http from 'http';
let request = require('request');

/**
 * Obtiene todas las prestaciones de un paciente por Documento
 *
 * @export
 * @param {any} documento
 * @returns
 */
export function postPrestaciones(documento) {
    return new Promise((resolve, reject) => {
        request({
            url:  configPrivate.wsSalud.hostHPN + configPrivate.wsSalud.hpnWS + 'BuscarEstudios',
            method: 'POST',
            json: true,
            body: {
                documento
            }
        }, function (error, response, body) {
            if (error) {
                reject(error);
            }
            if (body.d) {
                let prestaciones = body.d;
                let prestacionesValidadas = prestaciones.filter(p => p.Estado === 'Validada');
                if (prestacionesValidadas) {
                    resolve(prestacionesValidadas);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
}

export function downloadFile(id) {
    return new Promise((resolve, reject) => {
        let url = configPrivate.wsSalud.hostHPN + configPrivate.wsSalud.hpnWS + 'Informe?idEstudio=' + id;
        http.get(url , function (response) {
            if (response.statusCode === 200) {
                return resolve(response);
            } else {
                return reject({error: 'HPN-Informe', status: response.statusCode});
            }
        });
    });
}
