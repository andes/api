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

router.get('/puco/', async function (req, res, next) {
    if (req.query.dni) {
        let padron;
        let rta;

        if (req.query.periodo) {
            padron = req.query.periodo.substring(0, 7); // YYYY/MM
        } else {
            padron = await periodoPadronesPuco.find({}).sort({ $natural: 1 }).limit(1);   // ultimo padron
            padron = padron[0].version;
        }

        rta = await puco.find({ dni: Number.parseInt(req.query.dni), version: { $regex: padron } }).exec();

        if (rta.length > 0) {
            obraSocial.find({ codigoPuco: rta[0].codigoFinanciador }, function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json([{ dni: rta[0].dni, transmite: rta[0].transmite, nombre: rta[0].nombre, financiador: data[0].nombre, version: rta[0].version }]);
            });
        } else {
            res.json();
        }
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});

module.exports = router;
