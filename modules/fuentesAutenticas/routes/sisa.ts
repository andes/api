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
        let resultado = await postPuco(req.params.documento);
        if (resultado[0] === 200) {
            switch (resultado[1].Ciudadano.resultado) {
                case 'OK':
            }
        } else {
            // TODO: consultar BD mongo
            // default: sumar
            return next(500);
        }
    }
});




function postPuco(documento) {
    let xml = '';
    let pathSisa = 'https://sisa.msal.gov.ar/sisa/services/rest/puco/17723765';
    let optionsgetmsg = {
        host: configPrivate.sisa.host,
        port: configPrivate.sisa.port,
        path: pathSisa,
        method: 'POST',
        headers: {
            "content-type": "application/json",
        }
    };
    // Realizar POST request
    return new Promise((resolve, reject) => {
        let reqPost = https.request(optionsgetmsg);
        reqPost.on('error', function (e) {
            reject(e);
        });
        reqPost.write(JSON.stringify({ usuario: "hhfernandez", clave: "develop666" }));
        reqPost.end();
        reqPost.on('response', function (response) {
            console.log('STATUS: ' + response.statusCode);
            console.log('HEADERS: ' + JSON.stringify(response.headers));
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                console.log('BODY: ' + chunk);
                resolve(chunk);
            });
        });
    });
}


module.exports = router;
