import * as express from 'express';
import * as pais from '../schemas/pais_model';

let router = express.Router();

/**
 * @swagger
 * definition:
 *   pais:
 *     properties:
 *      id:
 *          type: string
 *      nombre:
 *          type: string
 */

/**
 * @swagger
 * /pais:
 *   get:
 *     tags:
 *       - Pais
 *     description: Retorna un arreglo de objetos pais
 *     summary: Listar paises
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción del país
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos pais
 *         schema:
 *           $ref: '#/definitions/pais'
 * /pais/{id}:
 *   get:
 *     tags:
 *       - Pais
 *     description: Un objeto pais
 *     summary: Buscar país por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: _Id del país
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un objeto pais
 *         schema:
 *           $ref: '#/definitions/pais'
 */
router.get('/paises/:id*?', function (req, res, next) {

    if (req.params.id) {
        pais.findById(req.params.id, function (err, data) {
            if (err) {
                next(err);
            };

            res.json(data);
        });
    } else {
        let query;

        query = pais.find({});
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', "i"));
        }
        query.sort({ 'nombre': 1 }).exec((err, data) => {
            if (err) {return next(err); };
            res.json(data);
        });
    }
});

export = router;
