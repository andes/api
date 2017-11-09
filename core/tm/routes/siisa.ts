import * as express from 'express';
import * as SIISA from '../schemas/siisa';

let router = express.Router();

/**
 * Entidades Formadoras
 */
router.post('/siisa/entidadesformadoras', function(req, resp, errorHandler) {
    let total = req.body.length;
    let saved = []

    req.body.forEach(element => {
        let siisa = new SIISA.EntidadFormadora(element);

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

router.get('/siisa/entidadesformadoras', function(req, resp, errorHandler) {
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
router.get('/siisa/profesion', function(req, resp, errorHandler) {
    SIISA.Profesion.find({}, (error, datos) => {
        if (error) {
            return errorHandler(error);
        }

        return resp.status(201).jsonp(datos);
    })
});

router.post('/siisa/profesion', function(req, resp, errorHandler){
    let total = req.body.length;
    let saved = []

    req.body.forEach(element => {
        let siisa_p = new SIISA.Profesion(element);

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

router.post('/siisa/paises', function(req, resp, errorHandler) {
    let total = req.body.length;
    let saved = []

    req.body.forEach(element => {
        let siisa_pais = new SIISA.Pais(element);

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
router.get('/siisa/especialidad', function(req, resp, errorHandler) {
    SIISA.Especialidad.find({}).exec(function(err, especialidades) {
        resp.json(especialidades);
    });
});


/**
 * Sexos
 */
router.get('/siisa/sexo', function(req, resp, errorHandler) {
    SIISA.Sexo.find({}).exec(function(err, sexos) {
        resp.status(201).json(sexos);
    });
});

/**
 * Modalidades Certificacion
 */
router.get('/siisa/modalidadesCertificacion', function(req, resp, errorHandler) {
    SIISA.ModalidadCertificacionEspecialidad.find({}).exec(function(err, modalidades) {
        resp.json(modalidades);
    });
});

/**
 * Establecimiento Certificador
 */
router.get('/siisa/establecimientosCertificadores', function(req, resp, errorHandler) {
    SIISA.EstablecimientoCertificador.find({}).exec(function(err, establecimientos) {
        resp.json(establecimientos);
    });
});

export = router;
