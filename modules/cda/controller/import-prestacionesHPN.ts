import * as configPrivate from '../../../config.private';
import * as http from 'http';
const request = require('request');

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
        }, (error, response, body) => {
            if (error) {
                reject(error);
            }
            if (body.d) {
                const prestaciones = body.d;
                const prestacionesValidadas = prestaciones.filter(p => p.Estado === 'Validada');
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
        const url = configPrivate.wsSalud.hostHPN + configPrivate.wsSalud.hpnWS + 'Informe?idEstudio=' + id;
        http.get(url , (response) => {
            if (response.statusCode === 200) {
                return resolve(response);
            } else {
                return reject({error: 'HPN-Informe', status: response.statusCode});
            }
        });
    });
}
