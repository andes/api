import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { matchSisa } from '../../../utils/servicioSisa';
import { Logger } from '../../../utils/logService';
import * as https from 'https';
import * as configPrivate from '../../../config.private';
let to_json = require('xmljson').to_json;
let router = express.Router();

router.get('/sisa', async function (req, res, next) {
    if (!Auth.check(req, 'fa:get:sisa')) {
        return next(403);
    }
    if (req.query) {
        let paciente = req.query;
        try {
            let pacienteSisa = await matchSisa(paciente);
            res.json(pacienteSisa);
            Logger.log(req, 'fa_sisa', 'validar', {
                resultado: pacienteSisa
            });
        } catch (err) {
            Logger.log(req, 'fa_sisa', 'error', {
                error: err
            });
            return next(err);
        }
    } else {
        return next(500);
    }
});

/**
 * @swagger
 * /puco/{documento}:
 *   patch:
 *     tags:
 *       - Puco
 *     description: Obtener obra social a partir del dni de un paciente
 *     summary: Obtener obra social a partir del dni de un paciente
 *     consumes:
 *       - string
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: documento
 *         in: path
 *         description: DNI de un paciente
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto obra social
 *         schema:
 *           $ref: '#/definitions/paciente'
 */

router.get('/puco/:documento', async function (req, res, next) {
    // if (!Auth.check(req, 'fa:get:puco')) {
    //     return next(403);
    // }
    if (req.params.documento) {
        try {
            let respuesta: any = await postPuco(req.params.documento);

            if (respuesta && respuesta.puco && respuesta.puco.resultado === 'OK') {
                res.json({ nombre: respuesta.puco.coberturaSocial, codigo: respuesta.puco.rnos });
            } else {
                // TODO: consultar BD mongo
                // default: sumar
                res.json({ nombre: 'Sumar', codigo: '123' });
            }
        } catch (e) {
            // TODO: consultar BD mongo
            // default: sumar
            res.json({ nombre: 'Sumar', codigo: '123' });
        }
    }
});




function postPuco(documento) {
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
        reqPost.on('error', function (e) {
            reject(e);
        });
        reqPost.write(JSON.stringify({ usuario: 'hhfernandez', clave: 'develop666' }));
        reqPost.end();
        reqPost.on('response', function (response) {
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                if (chunk.toString()) {
                    xml = xml + chunk.toString();
                }
                if (xml) {
                    // Se parsea el xml obtenido a JSON
                    to_json(xml, function (error, data) {
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


module.exports = router;
