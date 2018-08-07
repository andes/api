import * as express from 'express';
import { puco } from '../schemas/puco';
import { obraSocial } from '../schemas/obraSocial';

let router = express.Router();

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} dni
 * @returns
 */
router.get('/puco/', async function (req, res, next) {

    if (req.query.dni) {
        puco.find({ dni: Number.parseInt(req.query.dni) }, function (err, data) {
            if (err) {
                return next(err);
            }
            if (data && data.length > 0) {
                let primerOS: any = data[0];
                obraSocial.findOne({ codigoPuco: primerOS.codigoFinanciador }, function (err1, data1: any) {
                    if (err1) {
                        return next(err1);
                    }
                    primerOS['financiador'] = data1.nombre;
                    res.json(primerOS);
                });
            } else {
                res.json(null);
            }
        });
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});
module.exports = router;
