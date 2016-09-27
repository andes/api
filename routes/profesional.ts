import * as express from 'express'
import * as profesional from '../schemas/profesional'
import * as utils from '../utils/utils';

var router = express.Router();

/**
 * @swagger
 * definition:
 *   profesional:
 *     properties:
 *       documento:
 *         type: string
 *       activo:
 *         type: Boolean
 *       nombre:
 *         type: string
 *       apellido:
 *         type: string
 *       contacto:
 *         tipo:
 *          type: String
 *         valor:
 *          type: string
 *         ranking: 
 *          type: Number
 *         contacto: 
*           type: Date
 *         activo:
 *          type: Boolean
 *       sexo:
 *         type: string
 *       genero:
 *         type: string
 *       fechaNacimiento:
 *         type: Date
 *       fechaFallecimiento:
 *         type: Date
 *       direccion:
 *          valor:
 *           type:string
 *          codigoPostal:
 *           type:string
 *          ubicacion:
 *           type: ubicacionSchema
 *          ranking:
 *           type: Number
 *          geoReferencia:
 *           type: [Number]
 *          ultimaActualizacion:
 *           type: Date
 *          activo:
 *           type: Boolean
 *       estadoCivil:
 *         type: string
 *       foto:
 *         type: string
 *       rol:
 *         type: string
 *       especialidad:
 *          id:
 *           type: string
 *          nombre:
 *           type: string
 *       matriculas:
 *          numero:
 *           type: Number
 *          descripcion:
 *           type: string
 *          activo:
 *           type: Boolean
 *          periodo:
 *              inicio:
 *                  type: Date
 *              fin:
 *                  type: Date
 */

/**
 * @swagger
 * /profesional:
 *   get:
 *     tags:
 *       - Profesional
 *     description: Retorna un arreglo de profesionales
 *     summary: Listar profesionales
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: un arreglo de objetos profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 * /profesional/{id}:
 *   get:
 *     tags:
 *       - Profesional
 *     summary: Lista el profesional por ID
 *     description: Retorna un objeto profesional
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de un profesional
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: documento del profesional
 *         required : false
 *         type: string
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.get('/profesional/:_id*?', function(req, res, next) {
    if (req.params.id) {
        profesional.findById(req.params._id, function(err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {

        var query;
        var opciones = {};

        if (req.query.nombre) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombre)
            };
        }

        if (req.query.apellido) {
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.apellido)
            };
        }

        if (req.query.documento) {
            opciones['documento'] = utils.makePattern(req.query.documento)
        }

        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento
        }

        if (req.query.numeroMatricula) {
            opciones['matriculas.numero'] = req.query.numeroMatricula
        }

        if (req.query.especialidad) {
            opciones['especialidad.nombre'] = {
                '$regex': utils.makePattern(req.query.especialidad)
            };
        }


    }

    query = profesional.find(opciones);

    query.exec(function(err, data) {
        if (err) return next(err);
        res.json(data);
    });

});

router.post('/profesional', function(req, res, next) {
    var newProfesional = new profesional(req.body);
    newProfesional.save((err) => {
        if (err) {
            next(err);
        }

        res.json(newProfesional);
    });
});

router.put('/profesional/:_id', function(req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
});

router.delete('/profesional/:_id', function(req, res, next) {
    profesional.findByIdAndRemove(req.params._id, req.body, function(err, data) {
        if (err)
            return next(err);

        res.json(data);
    });
})

export = router;