import * as express from 'express';
import { puco } from '../schemas/puco';

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
            res.json(data);
        });
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});

router.get('/puco/version/', async function (req, res, next) {
    // periodo especifico
    if (req.params.periodo) {
        res.json({});
    } else {    // no se ingresa periodo
        res.json();
    }
});

module.exports = router;
