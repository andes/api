import * as mongoose from 'mongoose';
import * as express from 'express';
import { osPaciente } from '../schemas/osPaciente';
import * as configPrivate from '../../../config.private';
import * as https from 'https';
import { obraSocial } from '../schemas/obraSocial';
let to_json = require('xmljson').to_json;

let router = express.Router();

router.get('/puco/:documento', async function (req, res, next) {
    if (req.params.documento) {
        try {
            let respuesta: any = await getOs(req.params.documento);
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

async function getOs(doc) {
    let osPac: any = await osPaciente.find({ documento: doc }).exec();
    let codigo: string = osPac[0].codigoPuco;
    console.log(codigo);
    let result = await obraSocial.find({ codigoPuco: parseInt(codigo, 10) }).exec();
    console.log(result);
}



module.exports = router;
