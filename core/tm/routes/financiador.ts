import * as express from 'express'
import * as financiador from '../schemas/financiador'

let router = express.Router();
/**
 * @swagger
 * definition:
 *   financiador:
 *     properties:
 *      id:
 *          type: string
 *      nombre:
 *          type: string
 */

/**
 * @swagger
 * /financiador:
 *   get:
 *     tags:
 *       - Financiador
 *     description: Retorna un arreglo de objetos financiador
 *     summary: Listar financiadores
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: nombre
 *         in: query
 *         description: El nombre o descripción del financiador
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: un arreglo de objetos financiador
 *         schema:
 *           $ref: '#/definitions/financiador'
 * /financiador/{id}:
 *   get:
 *     tags:
 *       - Financiador
 *     description: Retorna un objeto financiador
 *     summary: buscar barrio por ID
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Id del financiador
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: un objeto financiador
 *         schema:
 *           $ref: '#/definitions/financiador'
 */
router.get('/financiadores/:id*?', function(req, res, next) {

   if (req.params.id) {
       financiador.findById(req.params.id, function (err, data) {
       if (err) {
           next(err);
       };

       res.json(data);
   });
   } else {
       let query;
        query = financiador.find({});
        if (req.query.nombre) {
            query.where('nombre').equals(RegExp('^.*' + req.query.nombre + '.*$', 'i'));
        }
        query.exec((err, data) => {
           if (err) {return next(err); };
           res.json(data);
        });
   }
});

export = router;
