import * as mongoose from 'mongoose';
import * as express from 'express';
// import { osPaciente } from '../schemas/osPaciente';
import * as configPrivate from '../../../config.private';
import * as https from 'https';
// import { obraSocial } from '../schemas/obraSocial';
import { puco } from '../schemas/puco';
let to_json = require('xmljson').to_json;

let router = express.Router();

router.get('/puco/', async function (req, res, next) {
    if (req.query.dni) {
        puco.find({ dni: Number.parseInt(req.query.dni) }, function (err, data) {
            if (data.length > 0) {
                res.json(data);
            } else {
                res.json([{ dni: req.query.dni, financiador: 'Sumar', codigoFinanciador: '499', transmite: '-'}]);
            }
            if (err) {
                return next(err);
            }
        });
    }

    // if (req.query.dni) {
    //     try {
    //         let respuesta: any = await getOs(req.query.dni);
    //         console.log('---------'+respuesta);
    //         if (respuesta) {
    //             res.json(respuesta);
    //         } else {
    //             // default: sumar
    //             res.json({ dni: req.query.dni, nombre: 'Sumar', codigoFinanciador: '499', transmite: 'N' });
    //         }
    //     } catch (e) {
    //         return next(e);
    //     }
    // } else {
    //     // default: sumar
    //     res.json({ nombre: 'Sumar', codigo: '499' });
    // }
});

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} doc
 * @returns
 */
// async function getOs(doc) {
//     let osPac: any = await osPaciente.find({ dni: doc }).exec();  // obtiene el código de obra social asociado al paciente
//     if (osPac && osPac.length > 0) {
//         // TODO: aqui deberíamos aplicar la priorización de obras sociales
//         let codigo: string = osPac[0].codigoFinanciador;
//         let result = await puco.find({ codigoFinanciador: parseInt(codigo, 10) }).exec(); // obtiene la información de la obra social
//         return result[0];
//     } else {
//         return null;
//     }
// }

module.exports = router;
