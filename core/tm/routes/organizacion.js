"use strict";
var express = require("express");
var organizacion = require("../schemas/organizacion");
var utils = require("../../../utils/utils");
var router = express.Router();
/**
 * @swagger
 * definition:
 *   organizacion:
 *     properties:
 *       codigo:
 *          type: object
 *          properties:
 *            sisa:
 *              type: string
 *            cuie:
 *              type: string
 *            remediar:
 *              type: string
 *       nombre:
 *          type: string
 *       tipoEstablecimiento:
 *          type: object
 *          properties:
 *            id:
 *              type: string
 *            nombre:
 *              type: string
 *       telecom:
 *          type: array
 *          items:
 *              type: object
 *              properties:
 *                  tipo:
 *                      type: string
 *                      enum:
 *                          - Teléfono Fijo
 *                          - Teléfono Celular
 *                          - email
 *                  valor:
 *                      type: string
 *                  ranking:
 *                      type: number
 *                      format: float
 *                  ultimaActualizacion:
 *                      type: string
 *                      format: date
 *                  activo:
 *                      type: boolean
 *       direccion:
 *          type: array
 *          items:
 *              $ref: '#/definitions/direccion'
 *       contacto:
 *          type: array
 *          items:
 *              $ref: '#/definitions/contacto'
 *       nivelComplejidad:
 *          type: number
 *          format: float
 *       activo:
 *          type: boolean
 *       fechaAlta:
 *          type: string
 *          format: date
 *       fechaBaja:
 *          type: string
 *          format: date
 */
/**
 * @swagger
 * /organizacion:
 *   get:
 *     tags:
 *       - Organizacion
 *     description: Retorna un arreglo de objetos organizacion
 *     summary: Listar organizaciones
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la organizacion
 *         required: false
 *         type: string
 *       - name: sisa
 *         in: query
 *         description: El codigo sisa de la organizacion
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos organizacion
 *         schema:
 *           $ref: '#/definitions/organizacion'
 * /organizacion/{id}:
 *   get:
 *     tags:
 *       - Organizacion
 *     summary: Listar organizaciones con filtro por ID
 *     description: Retorna un arreglo de objetos organizacion
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de una organizacion
 *         required: true
 *         type: string
 *       - name: tipo
 *         in: query
 *         description: _Id de una organizacion
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.get('/organizacion/:id*?', function (req, res, next) {
    if (req.params.id) {
        organizacion.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            res.json(data);
        }).populate('tipoEstablecimiento');
    }
    else {
        var query;
        var act = true;
        var filtros = { "activo": act };
        console.log("query ", req.query);
        if (req.query.nombre) {
            filtros['nombre'] = { '$regex': utils.makePattern(req.query.nombre) };
        }
        if (req.query.cuie) {
            filtros['codigo.cuie'] = { '$regex': utils.makePattern(req.query.cuie) };
        }
        if (req.query.sisa) {
            filtros['codigo.sisa'] = { '$regex': utils.makePattern(req.query.sisa) };
        }
        if (req.query.activo) {
            filtros['activo'] = req.query.activo;
        }
        var skip = parseInt(req.query.skip || 0);
        var limit = parseInt(req.query.limit || 10);
        query = organizacion.find(filtros).skip(skip).limit(limit).populate('tipoEstablecimiento');
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
/**
 * @swagger
 * /organizacion:
 *   post:
 *     tags:
 *       - Organizacion
 *     description: Cargar una organizacion
 *     summary: Cargar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: organizacion
 *         description: objeto organizacion
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/organizacion'
 *     responses:
 *       200:
 *         description: Un objeto organizacion
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.post('/organizacion', function (req, res, next) {
    var newOrganization = new organizacion(req.body);
    //console.log(req.body);
    newOrganization.save(function (err) {
        if (err) {
            //console.log(err);
            next(err);
        }
        res.json(newOrganization);
    });
});
/**
 * @swagger
 * /organizacion/{id}:
 *   put:
 *     tags:
 *       - Organizacion
 *     description: Actualizar una organizacion
 *     summary: Actualizar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una organizacion
 *         required: true
 *         type: string
 *       - name: organizacion
 *         description: objeto organizacion
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/organizacion'
 *     responses:
 *       200:
 *         description: Un objeto organizaciones
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.put('/organizacion/:id', function (req, res, next) {
    console.log(req.body);
    organizacion.findByIdAndUpdate(req.params.id, req.body, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
/**
 * @swagger
 * /organizacion/{id}:
 *   delete:
 *     tags:
 *       - Organizacion
 *     description: Eliminar una organizacion
 *     summary: Eliminar una organizacion
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una organizacion
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto organizaciones
 *         schema:
 *           $ref: '#/definitions/organizacion'
 */
router.delete('/organizacion/:_id', function (req, res, next) {
    organizacion.findByIdAndRemove(req.params._id, function (err, data) {
        if (err)
            return next(err);
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=organizacion.js.map