import * as express from 'express';
import { profe } from '../schemas/profe';

let router = express.Router();

router.get('/profe/', async function (req, res, next) {
    if (req.query.dni && req.query.periodo) {
        profe.find({ dni: Number.parseInt(req.query.dni), version: req.query.periodo }, function (err, data) {
            if (err) {
                return next(err);
            }
            res.json(data);
        });
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});


router.get('/profe/padrones/', async function (req, res, next) {
    let resp = await obtenerVersiones();
    res.json(resp);
});


// obtiene las versiones de todos los padrones cargados
async function obtenerVersiones() {
    let versiones = await profe.distinct('version').exec(); // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { 'version': versiones[i] };
    }
    versiones.sort((a, b) => compare(a.version, b.version));
    return versiones;
}

// Compara fechas. Junto con el sort ordena los elementos de mayor a menor.
function compare(a, b) {
    if (new Date(a) > new Date(b)) {
        return -1;
    }
    if (new Date(a) < new Date(b)) {
        return 1;
    }
    return 0;
}

module.exports = router;

