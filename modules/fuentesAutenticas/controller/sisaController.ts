import * as express from 'express';
import * as https from 'https';
import * as configPrivate from '../../../config.private';
let to_json = require('xmljson').to_json;
let router = express.Router();


export function postPuco(documento) {
    let xml = '';
    let pathSisa = 'https://sisa.msal.gov.ar/sisa/services/rest/puco/' + documento;
    let optionsgetmsg = {
        host: configPrivate.sisa.host,
        port: configPrivate.sisa.port,
        path: pathSisa,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        }
    };
    // Realizar POST request
    return new Promise((resolve, reject) => {
        let reqPost = https.request(optionsgetmsg);
        reqPost.on('error',  (e) => {
            reject(e);
        });
        reqPost.write(JSON.stringify({ usuario: 'hhfernandez', clave: 'develop666' }));
        reqPost.end();
        reqPost.on('response', (response) => {
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                if (chunk.toString()) {
                    xml = xml + chunk.toString();
                }
                if (xml) {
                    // Se parsea el xml obtenido a JSON
                    to_json(xml,  (error, data) => {
                        if (error) {
                            reject();
                        } else {
                            resolve(data);
                        }
                    });
                } else {
                    reject();
                }
            });
        });
    });
}
