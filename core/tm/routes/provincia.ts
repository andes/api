import * as mongoose from 'mongoose';
import * as express from 'express';
import * as provincia from '../schemas/provincia_model';
// import * as utils from '../../../utils/utils';

const router = express.Router();
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

router.get('/provincias', (req, res, next) => {
    if (req.query.id as any) {
        provincia.findById(req.query.id as any, (err, data) => {
            if (err) {
                return next(err);
            }

            res.json(data);
        });
    } else {
        const consulta = provincia.find({}).sort({ nombre: 1 });

        if (req.query.nombre as any) {
            consulta.where('nombre').equals(RegExp('^.*' + req.query.nombre as any + '.*$', 'i'));
        }
        if (req.query.pais as any) {
            consulta.where('pais._id').equals(mongoose.Types.ObjectId(req.query.pais as any));
        }

        consulta.exec((err, data) => {
            if (err) { return next(err); }

            res.json(data);
        });
    }
});

export = router;
