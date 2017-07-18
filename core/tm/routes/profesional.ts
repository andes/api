import { defaultLimit, maxLimit } from './../../../config';
import * as express from 'express';
import { profesional } from '../schemas/profesional';
import * as utils from '../../../utils/utils';
// import * as config from '../../../config';

let router = express.Router();

/**
 * @swagger
 * definition:
 *   profesional:
 *     properties:
 *       documento:
 *         type: string
 *       activo:
 *         type: boolean
 *       nombre:
 *         type: string
 *       apellido:
 *         type: string
 *       contacto:
 *         type: array
 *         items:
 *          type: object
 *          properties: 
 *               tipo:
 *                  type: string
 *                  enum: [
 *                      telefonoFijo,
 *                      telefonoCelular,
 *                      email
 *                  ]
 *               valor:
 *                  type: string
 *               ranking: 
 *                  type: number
 *               ultimaActualizacion: 
 *                  type: string
 *                  format: date
 *               activo:
 *                  type: boolean
 *       sexo:
 *         type: string
 *         enum: [
 *              femenino,
 *              masculino,
 *              otro 
 *         ]
 *       genero:
 *         type: string
 *         enum: [
 *           femenino,
 *           masculino,
 *           otro 
 *         ]
 *       fechaNacimiento:
 *         type: string
 *         format: date
 *       fechaFallecimiento:
 *         type: string
 *         format: date
 *       direccion:
 *         type: array
 *         items:
 *             $ref: '#/definitions/direccion'
 *       estadoCivil:
 *         type: string
 *         enum: [
 *           casado,
 *           separado,
 *           divorciado,
 *           viudo,
 *           soltero,
 *           otro
 *           ]
 *       foto:
 *         type: string
 *       rol:
 *         type: string
 *       especialidad:
 *          type: object
 *          properties:
 *            id:
 *                type: string
 *            nombre:
 *                type: string
 *       matriculas:
 *          type: array
 *          items: 
 *              type: object
 *              properties:
 *                  numero:
 *                      type: number
 *                  descripcion:
 *                      type: string
 *                  activo:
 *                      type: boolean
 *                  periodo:
 *                      type: object
 *                      properties:
 *                          inicio:
 *                              type: string
 *                              format: date
 *                          fin:
 *                              type: string
 *                              format: date
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
 *     summary: Lista el profesional por distintos filtros
 *     description: Retorna un objeto profesional
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de un profesional
 *         required: false
 *         type: string
 *       - name: nombre
 *         in: query
 *         description: nombre de un profesional
 *         required: false
 *         type: string
 *       - name: apellido
 *         in: query
 *         description: apellido de un profesional
 *         required: false
 *         type: string
 *       - name: documento
 *         in: query
 *         description: documento del profesional
 *         required : false
 *         type: string
 *       - name: fechaNacimiento
 *         in: query
 *         description: fecha de nacimiento del profesional
 *         required : false
 *         type: Date
 *       - name: matriculas.numero
 *         in: query
 *         description: número de matrícula del profesional
 *         required : false
 *         type: Number
 *       - name: especialidad.nombre
 *         in: query
 *         description: especialidad del profesional
 *         required : false
 *         type: string
 *       - name: skip
 *         in: query
 *         description: El valor numerico del skip
 *         required: false
 *         type: number
 *       - name: limit
 *         in: query
 *         description: El valor del limit
 *         required: false
 *         type: number
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.get('/profesionales/:id*?', function (req, res, next) {
    let opciones = {};
    let query;

    if (req.params.id) {
        profesional.findById(req.params._id, function (err, data) {
            if (err) {
                next(err);
            };
            res.json(data);
        });
    } else {
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

        if (req.query.nombreCompleto) {
            opciones['nombre'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
            opciones['apellido'] = {
                '$regex': utils.makePattern(req.query.nombreCompleto)
            };
        }

        if (req.query.documento) {
            opciones['documento'] = utils.makePattern(req.query.documento);
        }

        if (req.query.fechaNacimiento) {
            opciones['fechaNacimiento'] = req.query.fechaNacimiento;
        }

        if (req.query.numeroMatricula) {
            opciones['matriculas.numero'] = req.query.numeroMatricula;
        }

        if (req.query.especialidad) {
            opciones['especialidad.nombre'] = {
                '$regex': utils.makePattern(req.query.especialidad)
            };
        }
    }

    let radix = 10;
    let skip: number = parseInt(req.query.skip || 0, radix);
    let limit: number = Math.min(parseInt(req.query.limit || defaultLimit, radix), maxLimit);

    if (req.query.nombreCompleto) {
        query = profesional.find({ apellido: { '$regex': utils.makePattern(req.query.nombreCompleto) } }).
            sort({ apellido: 1, nombre: 1 });
    } else {
        query = profesional.find(opciones).skip(skip).limit(limit);
    }

    query.exec(function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });

});

/**
 * @swagger
 * /profesional:
 *   post:
 *     tags:
 *       - Profesional
 *     description: Cargar una profesional
 *     summary: Cargar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: profesional
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.post('/profesionales', function (req, res, next) {
    let newProfesional = new profesional(req.body);
    newProfesional.save((err) => {
        if (err) {
            next(err);
        }
        res.json(newProfesional);
    });
});

/**
 * @swagger
 * /profesional/{id}:
 *   put:
 *     tags:
 *       - Profesional
 *     description: Actualizar una profesional
 *     summary: Actualizar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *       - name: profesional
 *         description: objeto profesional
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/profesional'
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.put('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndUpdate(req.params._id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

/**
 * @swagger
 * /profesional/{id}:
 *   delete:
 *     tags:
 *       - Profesional
 *     description: Eliminar una profesional
 *     summary: Eliminar una profesional
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una profesional
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto profesional
 *         schema:
 *           $ref: '#/definitions/profesional'
 */
router.delete('/profesionales/:id', function (req, res, next) {
    profesional.findByIdAndRemove(req.params._id, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});

export = router;
