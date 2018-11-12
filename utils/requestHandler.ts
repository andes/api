import * as https from 'https';

/**
 *
 *
 * @export
 * @param {*} reqCfg ={
            host,
            port,
            path,
            method: 'GET/PUT/POST...',
            rejectUnauthorized: boolean
        }
 * @returns {Promise<any>}
 */
export function handleRequest(reqCfg, ): Promise<any> {
    return new Promise((resolve, reject) => {
        const reqGet = https.request(reqCfg, (res) => {
            let responseData = '';
            res.on('data', (chunk, error) => {
                if (error) { reject(error); }
                responseData = responseData + chunk;
            });
            res.on('end', () => {
                resolve(responseData);
            });
            res.on('error', (error) => {
                reject(error);
            });
        });
        reqGet.end();
    });
}
