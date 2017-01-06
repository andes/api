"use strict";
var express = require('express');
var especialidad = require('../schemas/especialidad');
var router = express.Router();
/**
 * @swagger
 * definition:
 *   especialidad:
 *     properties:
 *       nombre:
 *          type: string
 *       descripcion:
 *          type: string
 *       complejidad:
 *          type: integer
 *       disciplina:
 *          type: string
 *       codigo:
 *          type: object
 *          properties:
 *              sisa:
 *                  type: string
 *       habilitado:
 *          type: Boolean
 *       fechaAlta:
 *          type: string
 *          format: date
 *       fechaBaja:
 *          type: string
 *          format: date
 */
/**
 * @swagger
 * /especialidad:
 *   get:
 *     tags:
 *       - Especialidad
 *     description: Retorna un arreglo de objetos especialidad
 *     summary: Listar especialidades
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la especialidad
 *         required: false
 *         type: string
 *       - name: sisa
 *         in: query
 *         description: El codigo sisa de la especialidad
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos especialidad
 *         schema:
 *           $ref: '#/definitions/especialidad'
 * /especialidad/{id}:
 *   get:
 *     tags:
 *       - Especialidad
 *     summary: Listar especialidades con filtro por ID
 *     description: Retorna un arreglo de objetos especialidad
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de una especialidad
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: An array of especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.get('/especialidad/:id*?', function (req, res, next) {
    if (req.params.id) {
        especialidad.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = especialidad.find({}); //Trae todos 
        if (req.query.codigoSisa)
            query.where('codigo.sisa').equals(RegExp('^.*' + req.query.codigoSisa + '.*$', "i"));
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
/**
 * @swagger
 * /especialidad:
 *   post:
 *     tags:
 *       - Especialidad
 *     description: Cargar una especialidad
 *     summary: Cargar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: especialidad
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/especialidad'
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.post('/especialidad', function (req, res, next) {
    var newEspecialidad = new especialidad(req.body);
    newEspecialidad.save(function (err) {
        if (err) {
            return next(err);
        }
        res.json(newEspecialidad);
    });
});
/**
 * @swagger
 * /especialidad/{id}:
 *   put:
 *     tags:
 *       - Especialidad
 *     description: Actualizar una especialidad
 *     summary: Actualizar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una especialidad
 *         required: true
 *         type: string
 *       - name: especialidad
 *         description: objeto especialidad
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/especialidad'
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.put('/especialidad/:id', function (req, res, next) {
    especialidad.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
/**
 * @swagger
 * /especialidad/{id}:
 *   delete:
 *     tags:
 *       - Especialidad
 *     description: Eliminar una especialidad
 *     summary: Eliminar una especialidad
 *     consumes:
 *       - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id de una especialidad
 *         required: true
 *         type: string
 *
 *     responses:
 *       200:
 *         description: Un objeto especialidades
 *         schema:
 *           $ref: '#/definitions/especialidad'
 */
router.delete('/especialidad/:id', function (req, res, next) {
    especialidad.findByIdAndRemove(req.params.id, function (err, data) {
        if (err) {
            return next(err);
        }
        res.json(data);
    });
});
module.exports = router;
//# sourceMappingURL=especialidad.js.map