import * as request from 'request';
/**
 *
 *
 * @export
 * @param {*} path ={
            host,
            port,
            path,
            method: 'GET/PUT/POST...',
            rejectUnauthorized: boolean
        }
 * @returns {Promise<any>}
 */
export function handleHttpRequest(path): Promise<any> {

    return new Promise((resolve, reject) => {
        request(path, (err, response, body) => {
            if (!err) {
                let status = response && response.statusCode;
                return resolve([status, body]);
            } else {
                return reject(err);
            }
        });
    });
}
