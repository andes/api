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
            if (respuesta) {
                res.json({ nombre: respuesta.nombre, codigo: respuesta.codigoPuco });
            } else {
                // default: sumar
                res.json({ nombre: 'Sumar', codigo: '' });
            }
        } catch (e) {
            // default: sumar
            return next(e);
        }
    }
});

async function getOs(doc) {
    let osPac: any = await osPaciente.find({ documento: doc }).exec();
    let codigo: string = osPac[0].codigoPuco;
    let result = await obraSocial.find({ codigoPuco: parseInt(codigo, 10) }).exec();
    return result[0];
}

module.exports = router;
