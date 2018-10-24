import * as express from 'express';
import { Puco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';
import * as utils from '../../../utils/utils';

const router = express.Router();

/**
 * Obtiene todas las obras sociales
 * @returns array de obras sociales
 */
router.get('/', async (req, res, next) => {
    let query = {};
    if (req.query.nombre) {
        query = { nombre: { $regex: utils.makePattern(req.query.nombre) } };
    }
    ObraSocial.find(query).exec((err, obrasSociales) => {
        if (err) {
            return next(err);
        }
        obrasSociales = obrasSociales.map(os => {
            os.financiador = os.nombre;
            os.id = os._id;
            return os;
        });
        res.json(obrasSociales);
    });
});

/**
 * Obtiene los datos de la obra social asociada a un paciente
 *
 * @param {any} dni
 * @returns
 */

router.get('/puco', async (req, res, next) => {

    if (req.query.dni) {
        let padron;
        let rta;

        if (req.query.periodo) {
            padron = req.query.periodo;
        } else {
            padron = await obtenerVersiones();   // trae las distintas versiones de los padrones
            padron = padron[0].version; // asigna el ultimo padron actualizado
        }
        // realiza la busqueda por dni y el padron seteado anteriormente
        rta = await Puco.find({ dni: Number.parseInt(req.query.dni, 10), version: padron }).exec();

        if (rta.length > 0) {
            const resultOS = [];
            let unaOS;
            // genera un array con todas las obras sociales para una version de padron dada
            for (let i = 0; i < rta.length; i++) {
                unaOS = await ObraSocial.find({ codigoPuco: rta[i].codigoOS }).exec();
                resultOS[i] = { tipoDocumento: rta[i].tipoDoc, dni: rta[i].dni, transmite: rta[i].transmite, nombre: rta[i].nombre, codigoFinanciador: rta[i].codigoOS, idFinanciador: unaOS[0]._id, financiador: unaOS[0].nombre, version: rta[i].version };
            }
            res.json(resultOS);
        } else {
            res.json([]);
        }
    } else {
        res.json({ msg: 'Parámetros incorrectos' });
    }
});

router.get('/puco/padrones', async (req, res, next) => {
    try {
        let resp = await obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});


// obtiene las versiones de todos los padrones cargados
async function obtenerVersiones() {
    let versiones = await Puco.distinct('version').exec();  // esta consulta obtiene un arreglo de strings
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
