import * as express from 'express';
import * as parenteso from '../schemas/parentesco';

let router = express.Router();

/**
 * @swagger
 * definition:
 *   parentesco:
 *     properties:
 *      id:
 *          type: string
 *      nombre:
 *          type: string
 *      opuesto:
 *          type: string
 */

/**
 * @swagger
 * /parentescos:
 *   get:
 *     tags:
 *       - Parentesco
 *     description: Retorna un arreglo de objetos parentescos
 *     summary: Listar parentescos
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción del parentesco
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos parentesco
 *         schema:
 *           $ref: '#/definitions/parentesco'
 * /parentesco/{id}:
 *   get:
 *     tags:
 *       - Parentesco
 *     description: Un objeto parentesco
 *     summary: Buscar parentesco por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del parentesco
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un objeto parentesco
 *         schema:
 *           $ref: '#/definitions/parentesco'
 */
router.get('/parentescos/:id*?', function (req, res, next) {

    if (req.params.id) {
        parenteso.modelParentesco.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        let query;

        query = parenteso.modelParentesco.find({});
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        query.sort({ 'nombre': 1 }).exec((err, data) => {
            if (err) { return next(err); }
            res.json(data);
        });
    }
});

export = router;
