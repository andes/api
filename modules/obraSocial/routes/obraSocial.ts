import * as express from 'express';
import { puco } from '../schemas/puco';
// import { Date } from 'core-js';
import * as moment from 'moment';
import { stringify } from 'querystring';

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

router.get('/puco/version/:periodo*?', async function (req, res, next) {
    // se selecciona periodo especifico --> retorna padron de dicho periodo
    if (req.params.periodo) {
        puco.find({ version: req.params.periodo }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {    // no se selecciona periodo --> retorna los padrones de los ultimos <ultimos> periodos
        if (req.query.ultimos) {
            // obtiene ultimo registro insertado
            let ultimoReg: any = await puco.find({}).sort({ $natural: 1 }).limit(1);
            let ultimaVersion = JSON.parse(JSON.stringify(ultimoReg[0])).version;

            // Se crea un objeto Date para delegar el calculo de periodos hacia atras a buscar
            let ultimaFecha = moment(new Date(String(ultimaVersion).substring(0, 4) + '/' + (String(ultimaVersion).substring(4, 6) + '/' + String(ultimaVersion).substring(6, 8)))).format('YYYY/MM/DD');
            let fechaAux = moment(new Date(ultimaFecha)).subtract(req.query.ultimos, 'months').format('YYYYMMDD');
            let fechaDesde = Number.parseInt(fechaAux);

            puco.find({ version: { $gt: fechaDesde } }, function (err, data) {
                if (err) {
                    return next(err);
                }
                res.json({ ultimoPeriodo: ultimaVersion, padrones: data });
            });
        } else {
            res.status(400).json({ msg: 'Parámetros incorrectos' });
        }
    }
});

module.exports = router;
