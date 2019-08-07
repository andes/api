import * as express from 'express';
import { Puco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';
import * as pucoController from '../controller/puco';
import * as sumarController from '../controller/sumar';
import * as prepagaController from '../controller/prepagas';
const router = express.Router();

/**
 * Obtiene todas las obras sociales
 * @returns array de obras sociales
 */
router.get('/', async (req, res, next) => {
    let query;
    query = ObraSocial.find({});
    if (req.query.nombre) {
        query.where('nombre').equals(RegExp(`^.*${req.query.nombre}.*$`, 'i'));
    }
    if (req.query.prepaga === true) {
        query.where('prepaga').equals(true);
    }
    try {
        let obrasSociales = await query.exec();
        obrasSociales = obrasSociales.map(os => {
            os.financiador = os.nombre;
            os.id = os._id;
            return os;
        });
        res.json(obrasSociales);
    } catch (error) {
        return next(error);
    }
});

router.get('/prepagas', async (req, res, next) => {
    try {
        let prepagas = await ObraSocial.find({ prepaga: true }).exec();
        res.json(prepagas);
    } catch (error) {
        return next(error);
    }
});

/* TODO: validar con recupero si es necesario mirar SUMAR */
router.get('/sumar', async (req, res, next) => {
    try {
        let arrayOSSumar = await sumarController.pacienteSumar(req.query.dni);

        res.json(arrayOSSumar);
    } catch (error) {
        return next(error);
    }
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
        return next('Parámetros incorrectos');
    }
});

/**
 * Obtiene los datos de las obras sociales asociada a un paciente
 * verifica en padronPrepagas, luego en PUCO y por último en sumar
 * @param {dni, sexo}
 * @returns array de datos obra sociales
 */

router.get('/paciente', async (req, res, next) => {
    if (req.query.dni && req.query.sexo) {
        let prepaga = await prepagaController.getPaciente(req.query.dni, req.query.sexo);
        if (prepaga) {
            res.json([prepaga]);
        } else {
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
        }
    } else {
        return next('Parámetros incorrectos');
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

router.get('/puco/:documento', async (req, res, next) => {
    if (req.params.documento) {
        let arrayOSPuco: any = await pucoController.pacientePuco(req.params.documento);
        if (arrayOSPuco.length > 0) {
            res.json(arrayOSPuco);
        } else {
            let arrayOSSumar = await sumarController.pacienteSumar(req.params.documento);
            if (arrayOSSumar.length > 0) {
                res.json(arrayOSSumar);
            } else {
                res.json([]);
            }
        }
    } else {
        return next('Parámetros incorrectos');
    }
});

module.exports = router;
