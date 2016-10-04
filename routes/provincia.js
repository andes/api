"use strict";
var express = require('express');
var provincia = require('../schemas/provincia');
var router = express.Router();
/**
 * @swagger
 * definition:
 *   provincia:
 *     properties:
 *      id:
 *          type: string
 *      nombre:
 *          type: string
 *      pais:
 *          type: object
 *          properties:
 *              id:
 *                  type: string
 *              nombre:
 *                  type: string
 *
 */
/**
 * @swagger
 * /provincia:
 *   get:
 *     tags:
 *       - Provincia
 *     description: Retorna un arreglo de objetos provincias
 *     summary: Listar provincias
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción de la provincia
 *         required: false
 *         type: string
 *       - name: pais
 *         in: query
 *         description: _Id del pais
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos provincia
 *         schema:
 *           $ref: '#/definitions/provincia'
 * /provincia/{id}:
 *   get:
 *     tags:
 *       - Provincia
 *     description: Retorna un objeto provincia
 *     summary: buscar provincia por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id de la provincia
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un objeto provincia
 *         schema:
 *           $ref: '#/definitions/provincia'
 */
router.get('/provincia/:id*?', function (req, res, next) {
    if (req.params.id) {
        provincia.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            }
            ;
            res.json(data);
        });
    }
    else {
        var query;
        query = provincia.find({});
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        if (req.query.pais) {
            query.where('pais.id').equals(req.query.pais);
        }
        query.exec(function (err, data) {
            if (err)
                return next(err);
            res.json(data);
        });
    }
});
module.exports = router;
//# sourceMappingURL=provincia.js.map