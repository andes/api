import * as express from 'express';
import * as SIISA from '../schemas/siisa';

const router = express.Router();

/**
 * Entidades Formadoras
 */
router.post('/siisa/entidadesformadoras', (req, resp, errorHandler) => {
    const total = req.body.length;
    const saved = [];

    req.body.forEach(element => {
        const siisa = new SIISA.EntidadFormadora(element);

        siisa.save((error) => {
            if (error) {
                return errorHandler(error);
            }

            saved.push(siisa);

            if (saved.length === total) {
                resp.json(saved);
            }
        });
    });
});

router.get('/siisa/entidadesformadoras', (req, resp, errorHandler) => {
    SIISA.EntidadFormadora.find({}, (error, datos) => {
        if (error) {
            return errorHandler(error);
        }

        resp.jsonp(datos);
    });
});


/**
 * Profesiones
 */
router.get('/siisa/profesion', (req, resp, errorHandler) => {
    const query: any = {};
    if (req.query.habilitado) {
        query.habilitado = req.query.habilitado;
    }
    SIISA.Profesion.find(query, (error, datos) => {
        if (error) {
            return errorHandler(error);
        }
        return resp.status(201).jsonp(datos);
    });
});

router.post('/siisa/profesion', (req, resp, errorHandler) => {
    const total = req.body.length;
    const saved = [];
    req.body.forEach(element => {
        const siisa_p = new SIISA.Profesion(element);

        siisa_p.save((error) => {
            if (error) {
                return errorHandler(error);
            }

            saved.push(siisa_p);

            if (saved.length === total) {
                resp.json(saved);
            }
        });
    });
});


/**
 * Paises
 */

router.post('/siisa/paises', (req, resp, errorHandler) => {
    const total = req.body.length;
    const saved = [];

    req.body.forEach(element => {
        const siisa_pais = new SIISA.Pais(element);

        siisa_pais.save((error) => {
            if (error) {
                return errorHandler(error);
            }

            saved.push(siisa_pais);

            if (saved.length === total) {
                resp.json(saved);
            }
        });
    });
});

/**
 * Especialidades
 */
router.get('/siisa/especialidad', (req, resp, errorHandler) => {
    SIISA.Especialidad.find({}).exec((err, especialidades) => {
        resp.json(especialidades);
    });
});


/**
 * Sexos
 */
router.get('/siisa/sexo', (req, resp, errorHandler) => {
    SIISA.Sexo.find({}).exec((err, sexos) => {
        resp.status(201).json(sexos);
    });
});

/**
 * Modalidades Certificacion
 */
router.get('/siisa/modalidadesCertificacion', (req, resp, errorHandler) => {
    SIISA.ModalidadCertificacionEspecialidad.find({}).exec((err, modalidades) => {
        resp.json(modalidades);
    });
});

/**
 * Establecimiento Certificador
 */
router.get('/siisa/establecimientosCertificadores', (req, resp, errorHandler) => {
    SIISA.EstablecimientoCertificador.find({}).exec((err, establecimientos) => {
        resp.json(establecimientos);
    });
});

export = router;
