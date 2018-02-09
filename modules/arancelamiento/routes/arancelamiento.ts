import * as mongoose from 'mongoose';
import * as express from 'express';
import { osPaciente } from '../schemas/osPaciente';
import * as configPrivate from '../../../config.private';
import * as https from 'https';
let to_json = require('xmljson').to_json;

let router = express.Router();

router.get('puco/:documento', async function (req, res, next) {
    console.log("ENTRANDOOO")
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

async function getOs(codPuco) {
    let result = await osPaciente.find({ codigoPuco: codPuco }).exec();
    console.log(result);
}



module.exports = router;
