import * as express from 'express';
import { Puco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';
import * as utils from '../../../utils/utils';
import * as pucoController from '../controller/puco';
import * as sumarController from '../controller/sumar';


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
            padron = await pucoController.obtenerVersiones();   // trae las distintas versiones de los padrones
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

/**
 * Obtiene los datos de las obras sociales asociada a un paciente
 * verifica en PUCO y en la coleccion sumar (pacientes afiliados a SUMAR)
 * @param {any} dni
 * @returns array de datos obra sociales
 */

router.get('/paciente', async (req, res, next) => {

    if (req.query.dni) {
        let arrayOSPuco: any = await pucoController.pacientePuco(req.query.dni);
        if (arrayOSPuco.length > 0) {
            res.json(arrayOSPuco);
        } else {
            let arrayOSSumar = await sumarController.pacienteSumar(req.query.dni);
            if (arrayOSSumar.length > 0) {
                res.json(arrayOSSumar);
            } else {
                res.json([]);
            }
        }
    } else {
        res.json({ msg: 'Parámetros incorrectos' });
    }
});

router.get('/puco/padrones', async (req, res, next) => {
    try {
        let resp = await pucoController.obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});


module.exports = router;
