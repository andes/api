import * as express from 'express';
import { puco } from '../schemas/puco';
import { obraSocial } from '../schemas/obraSocial';
import { periodoPadronesPuco } from '../schemas/periodoPadronesPuco';

let router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} dni
 * @returns
 */

router.get('/puco/', async (req, res, next) => {

    if (req.query.dni) {
        let padron;
        let rta;

        if (req.query.periodo) {
            let date = new Date(req.query.periodo);
            let primerDia = new Date(date.getFullYear(), date.getMonth(), 1);
            primerDia.setHours(-3);
            let ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            ultimoDia.setHours(20); ultimoDia.setMinutes(59);   // adaptacion por desfasaje 3hs de registros en mongodb
            padron = { $gte: primerDia, $lt: ultimoDia };
        } else {
            padron = await periodoPadronesPuco.find({}).sort({ $natural: 1 }).limit(1);   // ultimo padron
            padron = new Date(padron[0].version);
            padron.setHours(-3);    // adaptacion por desfasaje 3hs de registros en mongodb
        }

        rta = await puco.find({ dni: Number.parseInt(req.query.dni, 2), version: padron }).exec();

        if (rta.length > 0) {
            let resultOS = [];
            let unaOS;
            for (let i = 0; i < rta.length; i++) {
                unaOS = await obraSocial.find({ codigoPuco: rta[i].codigoOS }).exec();
                resultOS[i] = { tipoDocumento: rta[i].tipoDoc, dni: rta[i].dni, transmite: rta[i].transmite, nombre: rta[i].nombre, codigoFinanciador: rta[i].codigoOS, financiador: unaOS[0].nombre, version: rta[i].version };
            }
            res.json(resultOS);
        } else {
            res.json([]);
        }
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});

module.exports = router;
