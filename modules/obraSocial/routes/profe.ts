import * as express from 'express';
import { Profe } from '../schemas/profe';

const router = express.Router();

router.get('/profe', async (req, res, next) => {
    if (req.query.dni && req.query.periodo) {
        let os = await Profe.find({ dni: Number.parseInt(req.query.dni, 10), version: req.query.periodo });
        res.json(os);
    } else {
        res.status(400).json({ msg: 'Parámetros incorrectos' });
    }
});


router.get('/profe/padrones', async (req, res, next) => {
    try {
        let resp = await obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});


// obtiene las versiones de todos los padrones cargados
async function obtenerVersiones() {
    let versiones = await Profe.distinct('version').exec(); // esta consulta obtiene un arreglo de strings
    for (let i = 0; i < versiones.length; i++) {
        versiones[i] = { version: versiones[i] };
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

