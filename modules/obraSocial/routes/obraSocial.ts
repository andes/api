import * as express from 'express';
import { Auth } from '../../../auth/auth.class';
import { obraSocialLog } from '../../../modules/obraSocial/obraSocialLog';
import * as obrasocialController from '../controller/obraSocial';
import * as profeController from '../controller/profe';
import * as pucoController from '../controller/puco';
import * as sumarController from '../controller/sumar';
import { ObraSocial } from '../schemas/obraSocial';
import { Profe } from '../schemas/profe';
import { IPuco } from '../schemas/puco';

const router = express.Router();

/**
 * Obtiene todas las obras sociales
 * @returns array de obras sociales
 */
router.get('/obrasSociales', async (req, res, next) => {
    const query = ObraSocial.find({});
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

/** Obtiene las el listado de prepagas */

router.get('/prepagas', async (req, res, next) => {
    try {
        const prepagas = await ObraSocial.find({ prepaga: true }).exec();
        res.json(prepagas);
    } catch (error) {
        return next(error);
    }
});

/** Verifica si el paciente se encuentra en el programa SUMAR */

router.get('/padronSumar', Auth.authenticate(), async (req, res, next) => {
    try {
        const arrayOSSumar = await sumarController.getPacienteSumar(req.query.dni);
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
    const dni = req.query.dni;
    if (dni) {
        const padron = req.query.periodo ? req.query.periodo : null;
        const sexo = req.query.sexo || 0;
        const respOSPuco: IPuco[] = await pucoController.getOSPuco(dni, sexo, padron);
        if (respOSPuco.length > 0) {
            const resultOS = [];
            try {
                for (let i = 0; i < respOSPuco.length; i++) {
                    const obraSocial = await ObraSocial.findOne({ codigoPuco: respOSPuco[i].codigoOS });
                    if (obraSocial) {
                        resultOS[i] = {
                            tipoDocumento: respOSPuco[i].tipoDoc,
                            dni: respOSPuco[i].dni,
                            transmite: respOSPuco[i].transmite,
                            nombre: respOSPuco[i].nombre,
                            codigoFinanciador: respOSPuco[i].codigoOS,
                            idFinanciador: obraSocial._id,
                            financiador: obraSocial.nombre,
                            version: respOSPuco[i].version
                        };
                    } else {
                        obraSocialLog.error('find', { codigoPuco: respOSPuco[i].codigoOS }, null, req);
                    }
                }
                res.json(resultOS);
            } catch (error) {
                return next(error);
            }
        } else {
            res.json([]);
        }
    } else {
        return next('Parámetros incorrectos');
    }
});

/** Obtiene las versiones del padron PUCO */

router.get('/puco/padrones', Auth.authenticate(), async (req, res, next) => {
    try {
        const resp = await pucoController.obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});

/** Obtiene la obra social de un paciente (Usado en el punto de inicio de CITAS) */

router.get('/obraSocial/:documento', Auth.authenticate(), async (req, res, next) => {
    if (req.params.documento) {
        const resp = await obrasocialController.getObraSocial(req.params);
        res.json(resp);
    } else {
        return next('Parámetros incorrectos');
    }
});

/** Obtiene paciente que se encuentra en el padron PROFE */

router.get('/profe', Auth.authenticate(), async (req, res, next) => {
    try {
        if (req.query.dni && req.query.periodo) {
            const os = await Profe.find({ dni: Number.parseInt(req.query.dni, 10), version: req.query.periodo });
            res.json(os);
        } else {
            res.status(400).json({ msg: 'Parámetros incorrectos' });
        }
    } catch (error) {
        return next(error);
    }
});

/** Obtiene los padrones del padron PROFE */

router.get('/profe/padrones', Auth.authenticate(), async (req, res, next) => {
    try {
        const resp = await profeController.obtenerVersiones();
        res.json(resp);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
