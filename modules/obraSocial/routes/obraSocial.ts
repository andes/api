import * as express from 'express';
import { Puco } from '../schemas/puco';
import { ObraSocial } from '../schemas/obraSocial';
import * as pucoController from '../controller/puco';
import * as profeController from '../controller/profe';
import * as sumarController from '../controller/sumar';
import * as obrasocialController from '../controller/obraSocial';
import { Profe } from '../schemas/profe';
import { Auth } from '../../../auth/auth.class';
import { obraSocialLog } from '../../../modules/obraSocial/obraSocialLog';
import { userScheduler } from '../../../config.private';

const router = express.Router();

/**
 * Obtiene todas las obras sociales
 * @returns array de obras sociales
 */
router.get('/obrasSociales', async (req, res, next) => {
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

/**Obtiene las el listado de prepagas */

router.get('/prepagas', async (req, res, next) => {
    try {
        let prepagas = await ObraSocial.find({ prepaga: true }).exec();
        res.json(prepagas);
    } catch (error) {
        return next(error);
    }
});

/**Verifica si el paciente se encuentra en el programa SUMAR */

router.get('/padronSumar', Auth.authenticate(), async (req, res, next) => {
    try {
        let arrayOSSumar = await sumarController.getPacienteSumar(req.query.dni);
        if (arrayOSSumar) {
            res.json(arrayOSSumar);
        } else {
            res.json([]);
        }

    } catch (error) {
        return next(error);
    }
});

/**
 * Obtiene los datos de la obra social asociada a un paciente (Usado en busqueda por padrones)
 *
 * @param {any} dni
 * @returns
 */

router.get('/puco', Auth.authenticate(), async (req, res, next) => {
    if (req.query.dni) {
        let padron;
        let rta;
        if (req.query.periodo) {
            padron = req.query.periodo;
        } else {
            padron = await pucoController.obtenerVersiones();   // trae las distintas versiones de los padrones
            if (padron.length === 0) {
                return res.json([]);
            }
            padron = padron[0].version; // asigna el ultimo padron actualizado
        }
        rta = await Puco.find({ dni: Number.parseInt(req.query.dni, 10), version: padron }).exec();
        if (rta.length > 0) {
            const resultOS = [];
            let unaOS;
            // genera un array con todas las obras sociales para una version de padron dada
            try {
                for (let i = 0; i < rta.length; i++) {
                    unaOS = await ObraSocial.find({ codigoPuco: rta[i].codigoOS });
                    if (unaOS?.length) {
                        resultOS[i] = { tipoDocumento: rta[i].tipoDoc, dni: rta[i].dni, transmite: rta[i].transmite, nombre: rta[i].nombre, codigoFinanciador: rta[i].codigoOS, idFinanciador: unaOS[0]._id, financiador: unaOS[0].nombre, version: rta[i].version };
                    } else {
                        // si la OS de puco, no se encuentra en la colección de obrasSociales
                        obraSocialLog.error('find', { codigoPuco: rta[i].codigoOS }, null, userScheduler);
                    }
                }
                res.json(resultOS);
            } catch (error) {
                next(error);
            }
        } else {
            res.json([]);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});

/**Obtiene las versiones del padron PUCO */

router.get('/puco/padrones', Auth.authenticate(), async (req, res, next) => {
    try {
        let resp = await pucoController.obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});

/**Obtiene la obra social de un paciente (Usado en el punto de inicio de CITAS) */

router.get('/obraSocial/:documento', Auth.authenticate(), async (req, res, next) => {
    if (req.params.documento) {
        let resp = await obrasocialController.getObraSocial(req.params);
        res.json(resp);
    } else {
        return next('Parámetros incorrectos');
    }
});

/** Obtiene paciente que se encuentra en el padron PROFE */

router.get('/profe', Auth.authenticate(), async (req, res, next) => {
    try {
        if (req.query.dni && req.query.periodo) {
            let os = await Profe.find({ dni: Number.parseInt(req.query.dni, 10), version: req.query.periodo });
            res.json(os);
        } else {
            res.status(400).json({ msg: 'Parámetros incorrectos' });
        }
    } catch (error) {
        return next(error);
    }
});

/**Obtiene los padrones del padron PROFE */

router.get('/profe/padrones', Auth.authenticate(), async (req, res, next) => {
    try {
        let resp = await profeController.obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
